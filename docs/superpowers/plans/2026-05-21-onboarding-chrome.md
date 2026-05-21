# Onboarding Chrome and Interest Chips Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the global sidebar and PromptBar while the onboarding (survey → interests → scenarios) is active; restore them with a fade+slide once the user finishes or skips onboarding; fix the empty interest chips and align onboarding content width with the rest of the app.

**Architecture:** Add a single source-of-truth predicate `isOnboarding(state)` in `src/state/app-state.ts` (already implicitly used in `src/app/page.tsx:52`). Wrap `AppSidebar` and `BottomBarSlot` in `<AnimatePresence>` with conditional rendering keyed on `!onboarding`. Guard `LaunchFlyout` against rendering during onboarding. Fix the interest-chip field reference (`i.name` → `i.label`, since `Interest` only has `label`) and bump two `max-w-xl` containers to `max-w-2xl` to match the project standard.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, motion/react v12, vitest.

**Spec:** `docs/superpowers/specs/2026-05-21-onboarding-chrome-design.md`
**Branch / Worktree:** `feature/onboarding-chrome` / `.worktrees/onboarding-chrome`

---

## File Structure

**Modify:**
- `src/state/app-state.ts` — add the exported selector `isOnboarding`.
- `src/state/app-state.test.ts` — add a `describe("isOnboarding")` block with 5 cases.
- `src/app/page.tsx` — import `motion`/`AnimatePresence`/`isOnboarding`, compute `onboarding` once, wrap `AppSidebar` and `BottomBarSlot` in `AnimatePresence`, guard `LaunchFlyout` with `&& !onboarding`.
- `src/sections/survey/onboarding-interests-screen.tsx` — change `i.name` to `i.label`; change container width `max-w-xl` → `max-w-2xl`.
- `src/sections/survey/onboarding-scenarios-screen.tsx` — change container width `max-w-xl` → `max-w-2xl`.

**Create:** none — every change lives in an existing file.

---

## Task 0: Set up the worktree

**Files:** none (setup only)

- [ ] **Step 1: Create the worktree off `main`**

Run from the repository root (`/home/user/afina-ai-first`):

```bash
git worktree add .worktrees/onboarding-chrome -b feature/onboarding-chrome main
cd .worktrees/onboarding-chrome
npm install
```

Expected: worktree created, `npm install` finishes without errors. All subsequent steps run inside `.worktrees/onboarding-chrome/`.

- [ ] **Step 2: Verify baseline is green**

Run from `.worktrees/onboarding-chrome`:

```bash
npm test
npm run lint
```

Expected: both green. If they aren't, stop and report — do not start the work on a broken baseline.

---

## Task 1: Add the `isOnboarding` predicate (TDD)

**Files:**
- Modify: `src/state/app-state.ts`
- Modify: `src/state/app-state.test.ts`

The spec calls for a single predicate `isOnboarding(state)` that matches the implicit check already used in `src/app/page.tsx:52` (`view.kind === "welcome" && surveyStatus === "not_started"`). We add it as a pure selector next to `isOnWelcome` and friends, then exercise it from tests before any UI uses it.

- [ ] **Step 1: Write the failing tests**

Append the following block to the end of `src/state/app-state.test.ts` (after the closing `});` of the last existing `describe`):

```ts
describe("isOnboarding", () => {
  it("returns true when welcome view + surveyStatus 'not_started'", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "welcome" },
      surveyStatus: "not_started",
    };
    expect(isOnboarding(state)).toBe(true);
  });

  it("returns false when surveyStatus is 'completed'", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "welcome" },
      surveyStatus: "completed",
    };
    expect(isOnboarding(state)).toBe(false);
  });

  it("returns false when surveyStatus is 'skipped'", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "welcome" },
      surveyStatus: "skipped",
    };
    expect(isOnboarding(state)).toBe(false);
  });

  it("returns false when view is guided-signal even with surveyStatus 'not_started'", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "guided-signal" },
      surveyStatus: "not_started",
    };
    expect(isOnboarding(state)).toBe(false);
  });

  it("returns false when view is a section even with surveyStatus 'not_started'", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "section", name: "Сигналы" },
      surveyStatus: "not_started",
    };
    expect(isOnboarding(state)).toBe(false);
  });
});
```

Also add `isOnboarding` to the existing import at the top of the file. The current import block is:

```ts
import {
  appReducer,
  initialState,
  isCampaignDone,
  type AppState,
  type Signal,
  type Campaign,
} from "./app-state";
```

Replace it with:

```ts
import {
  appReducer,
  initialState,
  isCampaignDone,
  isOnboarding,
  type AppState,
  type Signal,
  type Campaign,
} from "./app-state";
```

- [ ] **Step 2: Run the test file — expect failure**

Run from `.worktrees/onboarding-chrome`:

```bash
npm test -- app-state
```

Expected: tests fail to compile because `isOnboarding` is not exported from `./app-state`. Error text contains the missing export name.

- [ ] **Step 3: Implement `isOnboarding`**

In `src/state/app-state.ts`, find the final block of pure selectors at the bottom of the file. It currently ends like this:

```ts
export const isSignalDone = (s: AppState) => s.signals.length > 0;
export const isCampaignDone = (s: AppState) =>
  s.campaigns.some(
    (c) =>
      c.status === "active" ||
      c.status === "paused" ||
      c.status === "completed"
  );
export const isStep1Active = (s: AppState) => !isSignalDone(s);
export const isStep2Active = (s: AppState) => isSignalDone(s) && !isCampaignDone(s);
export const isStep3Active = (s: AppState) => isCampaignDone(s);
export const isWorkflowView = (s: AppState) => s.view.kind === "workflow";
export const isOnWelcome = (s: AppState) => s.view.kind === "welcome";
```

Append immediately after `isOnWelcome`:

```ts
/**
 * True while the first-entry onboarding (survey → interests → scenarios) is
 * in flight. Sidebar and PromptBar are hidden during this window; once the
 * user completes or skips, surveyStatus moves off "not_started" and the
 * predicate flips to false.
 *
 * Mirrors the implicit gate in `src/app/page.tsx` that picks between
 * `SurveySection` and `WelcomeSection`; keep them in sync.
 */
export const isOnboarding = (s: AppState): boolean =>
  s.view.kind === "welcome" && s.surveyStatus === "not_started";
```

- [ ] **Step 4: Run the tests — expect pass**

```bash
npm test -- app-state
```

Expected: all five new `isOnboarding` tests pass; no existing test regresses.

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/app-state.ts src/state/app-state.test.ts
git commit -m "feat(state): add isOnboarding predicate for chrome gating"
```

---

## Task 2: Fix interest chips field reference (`i.name` → `i.label`)

**Files:**
- Modify: `src/sections/survey/onboarding-interests-screen.tsx`

The current code reads `i.name` on the `Interest` type, which only defines `label` (see `src/types/directions.ts:11-16`). `i.name` is `undefined` at runtime, so the four pre-filled chips render with an empty string. The fix is a one-word swap. We can cover this with a small unit test of the pure helper, but the helper is currently inlined as `defaultInterestLabels` inside the component. We'll extract it to make it testable.

- [ ] **Step 1: Write the failing test**

Create the test in the same file path so it lives next to the component: `src/sections/survey/onboarding-interests-screen.test.ts`.

Write:

```ts
import { describe, it, expect } from "vitest";
import { defaultInterestLabels } from "./onboarding-interests-screen";

describe("defaultInterestLabels", () => {
  it("returns labels from the matching vertical (finance)", () => {
    const result = defaultInterestLabels("finance");
    // First four interests of the `finance` vertical, in declaration order,
    // per src/data/triggers-by-vertical.ts.
    expect(result).toEqual([
      "Кредитование",
      "Рассрочка и BNPL",
      "Ипотека",
      "Инвестиции и накопления",
    ]);
  });

  it("falls back to the first vertical when direction id is unknown", () => {
    const fallback = defaultInterestLabels("__nope__");
    expect(fallback.length).toBeGreaterThan(0);
    // Strings, not undefined — this is the regression we're guarding against.
    fallback.forEach((label) => expect(typeof label).toBe("string"));
    fallback.forEach((label) => expect(label.length).toBeGreaterThan(0));
  });

  it("returns at most 4 labels", () => {
    expect(defaultInterestLabels("finance").length).toBeLessThanOrEqual(4);
  });

  it("never returns undefined entries (regression: i.name vs i.label)", () => {
    const result = defaultInterestLabels("finance");
    expect(result.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
npm test -- onboarding-interests-screen
```

Expected: import fails because `defaultInterestLabels` is not exported. Even after export, the assertion `expect(result).toEqual([...labels...])` would fail because the current implementation reads `i.name` and returns `[undefined, undefined, undefined, undefined]`.

- [ ] **Step 3: Export and fix `defaultInterestLabels`**

Open `src/sections/survey/onboarding-interests-screen.tsx`. The current helper is:

```ts
function defaultInterestLabels(direction: string): string[] {
  const vertical = VERTICALS.find((v) => v.id === direction) ?? VERTICALS[0];
  // Take up to 4 interest names from the matched vertical — the screen is a
  // chip picker, not a serious data step.
  return vertical?.interests.slice(0, 4).map((i) => i.name) ?? [];
}
```

Replace it with:

```ts
export function defaultInterestLabels(direction: string): string[] {
  const vertical = VERTICALS.find((v) => v.id === direction) ?? VERTICALS[0];
  // Take up to 4 interest labels from the matched vertical — the screen is a
  // chip picker, not a serious data step.
  return vertical?.interests.slice(0, 4).map((i) => i.label) ?? [];
}
```

Two changes: add `export` and swap `i.name` → `i.label`.

- [ ] **Step 4: Run the test — expect pass**

```bash
npm test -- onboarding-interests-screen
```

Expected: all four tests green.

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/sections/survey/onboarding-interests-screen.tsx src/sections/survey/onboarding-interests-screen.test.ts
git commit -m "fix(onboarding): use Interest.label for chip text"
```

---

## Task 3: Align onboarding content widths to `max-w-2xl`

**Files:**
- Modify: `src/sections/survey/onboarding-interests-screen.tsx`
- Modify: `src/sections/survey/onboarding-scenarios-screen.tsx`

Project standard for centred content columns is `max-w-2xl` (672 px) — used in `welcome-view.tsx:27`, `survey-form.tsx:62`, `signals-section.tsx:90`. Two onboarding screens still use `max-w-xl` (576 px). This is a pure visual change with no behaviour to assert from a unit test; verification happens via the dev server in Step 3.

**Why no unit test for this step:** the change touches only Tailwind class strings on visual containers. There is no logic branch, no derived state, no exported function. A snapshot test would add maintenance overhead without catching real regressions. The verification is a visual diff at runtime.

- [ ] **Step 1: Bump the interests screen container**

In `src/sections/survey/onboarding-interests-screen.tsx`, find the root `<motion.div>`:

```tsx
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
```

Change the className to:

```tsx
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
```

(Only `max-w-xl` → `max-w-2xl`. Leave the rest intact.)

- [ ] **Step 2: Bump the scenarios screen container**

In `src/sections/survey/onboarding-scenarios-screen.tsx`, find the root `<motion.div>`:

```tsx
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="mx-auto flex w-full max-w-xl flex-col items-start gap-6"
    >
```

Change the className to:

```tsx
      className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6"
```

(Only `max-w-xl` → `max-w-2xl`. Leave the rest intact.)

- [ ] **Step 3: Lint, then visual verification in dev**

```bash
npm run lint
```

Expected: clean.

Then start the dev server (port 3001 to avoid colliding with the main checkout):

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/onboarding-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200.

In the browser at `http://localhost:3001`:
1. Open devtools, run `localStorage.clear(); location.reload()` to force the onboarding from scratch.
2. Complete the company-site step (any text), then proceed to the "Уточним детали" (interests) screen. **Expected:** the centred column is wider than before — roughly matches the Welcome hero column (672 px). The four chips show real labels (this confirms Task 2 still works): «Кредитование», «Рассрочка и BNPL», «Ипотека», «Инвестиции и накопления» (for default direction `finance`).
3. Click «Продолжить →» to reach the "Мы нашли 24 сценария…" screen. **Expected:** same wider column.

If the widths look wrong, stop and fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/sections/survey/onboarding-interests-screen.tsx src/sections/survey/onboarding-scenarios-screen.tsx
git commit -m "feat(onboarding): widen interests/scenarios screens to max-w-2xl"
```

---

## Task 4: Hide chrome during onboarding (sidebar + bottom bar) with motion enter/exit

**Files:**
- Modify: `src/app/page.tsx`

This task adds the chrome-gating wrapper. We use `AnimatePresence initial={false}` so a reload during onboarding shows no chrome and no animation — the chrome only animates IN when the user transitions from `not_started` to any other survey status (`completed` via catalog select, or `skipped` via the skip button).

**Why no unit test for this step:** the logic boils down to a boolean read (`isOnboarding(state)`) and a conditional render. The predicate itself is covered in Task 1. Asserting that JSX includes/excludes a `<motion.div>` would require either DOM rendering (over-tests motion library internals) or snapshot tests (brittle). Visual smoke in Step 4 covers the wiring.

- [ ] **Step 1: Add imports**

Open `src/app/page.tsx`. The current imports include:

```tsx
import { useAppState, useAppDispatch } from "@/state/app-state-context";
```

Immediately after that import, add:

```tsx
import { isOnboarding } from "@/state/app-state";
import { AnimatePresence, motion } from "motion/react";
```

- [ ] **Step 2: Define the chrome easing constant near the top**

In `src/app/page.tsx`, between the imports block and the `BottomBarSlot` declaration (around line 30), add:

```tsx
/**
 * Same exponential curve as HERO_EASE in welcome-view.tsx — exit/enter the
 * chrome with no bounce and a duration that matches the welcome hero swap.
 */
const CHROME_EASE = [0.32, 0.72, 0, 1] as const;
const CHROME_DURATION = 0.42;
```

- [ ] **Step 3: Compute the `onboarding` flag in `Home`**

Find the existing destructure at the top of `Home`:

```tsx
export default function Home() {
  const { view, launchFlyoutOpen, activeSection, catalog, surveyStatus } = useAppState();
  const dispatch = useAppDispatch();
  const welcomeChat = useOnboardingChat();
```

Replace with:

```tsx
export default function Home() {
  const state = useAppState();
  const { view, launchFlyoutOpen, activeSection, catalog, surveyStatus } = state;
  const onboarding = isOnboarding(state);
  const dispatch = useAppDispatch();
  const welcomeChat = useOnboardingChat();
```

We keep the destructure for readability while also keeping the full `state` object so we can pass it to `isOnboarding`. `surveyStatus` stays destructured because it's still read directly in `renderMain` below — do not remove it.

- [ ] **Step 4: Wrap `AppSidebar` in `AnimatePresence` and guard `LaunchFlyout`**

Find the current chrome block (the `<div className="flex h-screen overflow-hidden bg-background">` and its first three children):

```tsx
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar
            activeNav={activeSection ?? undefined}
            onNavChange={(nav) => dispatch({ type: "sidebar_nav", section: nav })}
            onLaunchOpen={() => dispatch({ type: "flyout_open" })}
            onLogoClick={() => dispatch({ type: "go_welcome" })}
            flyoutOpen={launchFlyoutOpen}
          />
          <LaunchFlyout
            open={launchFlyoutOpen}
            onClose={() => dispatch({ type: "flyout_close" })}
          />
          <ScenarioCatalogModal
            open={catalog !== null}
            onClose={() => dispatch({ type: "catalog_close" })}
            onSelect={(scenarioId) => dispatch({ type: "catalog_select", scenarioId })}
          />
```

Replace with:

```tsx
        <div className="flex h-screen overflow-hidden bg-background">
          <AnimatePresence initial={false}>
            {!onboarding && (
              <motion.div
                key="app-sidebar"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: CHROME_DURATION, ease: CHROME_EASE }}
              >
                <AppSidebar
                  activeNav={activeSection ?? undefined}
                  onNavChange={(nav) => dispatch({ type: "sidebar_nav", section: nav })}
                  onLaunchOpen={() => dispatch({ type: "flyout_open" })}
                  onLogoClick={() => dispatch({ type: "go_welcome" })}
                  flyoutOpen={launchFlyoutOpen}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {!onboarding && (
            <LaunchFlyout
              open={launchFlyoutOpen}
              onClose={() => dispatch({ type: "flyout_close" })}
            />
          )}
          <ScenarioCatalogModal
            open={catalog !== null}
            onClose={() => dispatch({ type: "catalog_close" })}
            onSelect={(scenarioId) => dispatch({ type: "catalog_select", scenarioId })}
          />
```

Two changes:
1. `AppSidebar` is now wrapped in `<AnimatePresence initial={false}>{!onboarding && <motion.div …><AppSidebar … /></motion.div>}</AnimatePresence>`.
2. `LaunchFlyout` is guarded by `{!onboarding && …}`. We don't motion-wrap it — it already manages its own visibility (`if (!open) return null;` at line 88 of `launch-flyout.tsx`), and during onboarding `launchFlyoutOpen` should never be true anyway. This is belt-and-braces.
3. `ScenarioCatalogModal` is **NOT** guarded — it's the modal that runs as part of onboarding (catalog opens from onboarding interests/scenarios), so it must keep rendering. Its own `open={catalog !== null}` prop handles visibility.

- [ ] **Step 5: Wrap `BottomBarSlot` in `AnimatePresence`**

Find the existing inner column near the bottom of `Home`:

```tsx
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {renderMain()}
            <BottomBarSlot />
            <ChatDrawer placeholder="Введите ваши параметры или задайте вопрос" />
            <DevPanel />
          </div>
```

Replace with:

```tsx
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {renderMain()}
            <AnimatePresence initial={false}>
              {!onboarding && (
                <motion.div
                  key="bottom-bar"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: CHROME_DURATION, ease: CHROME_EASE }}
                >
                  <BottomBarSlot />
                </motion.div>
              )}
            </AnimatePresence>
            <ChatDrawer placeholder="Введите ваши параметры или задайте вопрос" />
            <DevPanel />
          </div>
```

Note: `ChatDrawer` and `DevPanel` are **not** wrapped — drawer state and the dev panel are orthogonal to onboarding chrome. The drawer is closed by default; the dev panel is only visible in dev.

- [ ] **Step 6: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all green. The chrome wrapping has no test failures because we have no DOM-level tests for `page.tsx` — only the pure `isOnboarding` selector (already covered in Task 1) and the helper (Task 2). If a snapshot or DOM test exists that broke, stop and read its assertions before changing anything.

- [ ] **Step 8: Manual smoke in dev**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/onboarding-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200.

In the browser at `http://localhost:3001`, run `localStorage.clear(); location.reload()` in devtools, then walk through this matrix:

| # | Step | Expected |
|---|---|---|
| 1 | Land on the survey form (company name + site) | No left sidebar visible. No bottom PromptBar visible. The dev panel toggle (bottom-right) is still present. |
| 2 | Submit the form to reach the "Подбираем интересы…" loader | Still no sidebar, no PromptBar. |
| 3 | Land on the "Уточним детали" interests screen | Still no sidebar, no PromptBar. Chips render with real labels (Task 2). Column width matches the welcome hero (Task 3). |
| 4 | Click «Продолжить →» to reach the scenarios screen ("Мы нашли 24 сценария…") | Still no sidebar, no PromptBar. |
| 5 | Click «Выбрать сценарий →» — catalog modal opens | Catalog modal renders correctly (it is NOT chrome-gated). Sidebar/PromptBar still hidden underneath. |
| 6 | Close the catalog modal without selecting (esc / backdrop / X) | Catalog closes; user lands on Welcome (per `catalog_close` reducer with `returnTo: "onboarding"`). Sidebar and PromptBar fade-and-slide IN with ≈ 420 ms exponential easing. |
| 7 | Hard reload | Onboarding stays bypassed (surveyStatus is now `completed`). Chrome is present from the first paint, with no animation (because `initial={false}`). |
| 8 | Open devtools, `localStorage.clear(); location.reload()` again | Back to the survey form, chrome hidden again. This is the same path as #1 — chrome stays hidden, no animation playing in reverse. |
| 9 | On the survey form, click «Пропустить» (skip) | Survey skip dispatches `survey_skipped` → `surveyStatus` becomes `"skipped"`. The Welcome screen renders. Sidebar and PromptBar fade-and-slide IN. |
| 10 | After onboarding is done, click the logo (top-left of the sidebar) to dispatch `go_welcome` | Stays on Welcome. Sidebar/PromptBar remain visible (no flicker, because `surveyStatus` is now `completed`/`skipped`, not `not_started`). |

If any row breaks, fix it before moving on. Don't commit until #1–#10 all behave.

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(shell): hide sidebar and PromptBar during onboarding with fade/slide reveal"
```

---

## Task 5: End-to-end verification of all acceptance criteria

**Files:** none (verification only)

This task exists to walk the full ТЗ §9 acceptance list one last time in a single sitting and catch any cross-task interaction the per-task smokes missed.

- [ ] **Step 1: Full test + lint pass**

From `.worktrees/onboarding-chrome`:

```bash
npm test
npm run lint
```

Expected: both green.

- [ ] **Step 2: Acceptance matrix walk-through**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/onboarding-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200. Then in the browser at `http://localhost:3001`, with `localStorage.clear(); location.reload()` between distinct scenarios:

| AC | What | Expected |
|---|---|---|
| AC1 | During survey form, interests, scenarios, and the catalog-opened-from-onboarding state | Sidebar invisible, PromptBar invisible. |
| AC2a | Complete onboarding via catalog (close after select or back to welcome) | Sidebar appears with fade + slide-from-left ≈ 420 ms. PromptBar appears with fade + slide-from-bottom ≈ 420 ms. Easing is exponential (no bounce, no overshoot). |
| AC2b | Repeat with the skip path (survey form → «Пропустить») | Same animation behaviour as AC2a. |
| AC3 | On interests screen with default direction (finance) | Chips read: «Кредитование», «Рассрочка и BNPL», «Ипотека», «Инвестиции и накопления». No empty pills. |
| AC4 | Compare interests + scenarios columns visually to the Welcome hero column | All three sit on the same `max-w-2xl` (≈ 672 px) column. The interests and scenarios screens are clearly wider than the pre-fix `max-w-xl`. |
| AC5 | Welcome (post-onboarding) | Three step cards visible. Step 1 carries a «Создать сигнал» button that dispatches `start_signal_flow`. (Verified, no change required by this plan.) |

- [ ] **Step 3: Edge-case sanity checks**

| # | What | Expected |
|---|---|---|
| E1 | Reload during the interests step | `surveyStatus` is still `not_started`. `SurveySection` re-mounts at phase=form (this is existing behaviour). Chrome stays hidden — no flash. |
| E2 | Reload after onboarding | Chrome renders on first paint, no animation. |
| E3 | After onboarding, click sidebar nav → «Сигналы» → use the launch flyout | Flyout opens normally. Returning to welcome via logo click does not retrigger any chrome animation. |
| E4 | Open devtools network panel, throttle to Fast 3G, reload during onboarding | Chrome still doesn't render at any point during onboarding — there's no flash of chrome before `isOnboarding` is computed. (Because we read `state` synchronously and the reducer is initialised before paint.) |

If any edge case fails, fix it before closing out. Common likely failure: AC2b with `survey_skipped` not triggering chrome enter — would mean `isOnboarding` is reading something stale. Re-read Task 1 Step 3.

- [ ] **Step 4: Report back**

Summarise to the user:
- Worktree path: `.worktrees/onboarding-chrome`
- Branch: `feature/onboarding-chrome`
- Commits on the branch: run `git log --oneline main..HEAD` and quote the count + subject lines.
- Anything that needed a follow-up fix during AC walkthrough.
- Reminder that cleanup (`git worktree remove`, branch delete, merge) is the user's call — agent does not push or merge.
