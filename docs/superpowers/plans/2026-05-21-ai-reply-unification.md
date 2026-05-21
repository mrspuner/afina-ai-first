# AI reply — unify into PromptBar slot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Удалить плавающий alert-bubble с ответом нейронки из `workflow-section.tsx` и рендерить ответ внутри `<PromptBar slot=...>` рядом с draft-queue/budget-help, используя тот же визуальный паттерн (mascot + текст в `border-white/10 bg-white/5`). Auto-dismiss через 5 секунд сохраняется, кнопка «×» удаляется.

**Architecture:** Состояние `state.aiReply` и actions `ai_reply_shown` / `ai_reply_dismissed` уже живут в reducer (`src/state/app-state.ts`) — их не трогаем. Auto-dismiss таймер переезжает в `ShellBottomBar` (там же, где рендерится слот). Новый рендер — `motion.div` внутри слотового фрагмента в `shell-bottom-bar.tsx`, копия паттерна `budget-help-answer`. Старый floating bubble + его таймер удаляются из `workflow-section.tsx`. Reducer-тесты на `aiReply` уже существуют (строки 394–403 `app-state.test.ts`) и не требуют изменений; добавляем новый pure-тест для отдельного хука `useAiReplyAutoDismiss`, который инкапсулирует таймер и удобно тестируется через `vi.useFakeTimers()`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, motion/react (motion v12), vitest (reducer + hook-таймер тесты), `@testing-library/react` (для hook-теста через `renderHook`).

**Spec:** `docs/superpowers/specs/2026-05-21-ai-reply-unification-design.md`
**Ветка/воркстри:** `feature/ai-reply-unification` / `.worktrees/ai-reply-unification`

---

## File Structure

**Create:**
- `src/sections/shell/use-ai-reply-auto-dismiss.ts` — компактный хук-обёртка над `setTimeout`, который слушает `state.aiReply` и диспатчит `ai_reply_dismissed` через 5 секунд. Выделен отдельным файлом, чтобы покрыть таймер unit-тестом без mount'а тяжёлых компонентов.
- `src/sections/shell/use-ai-reply-auto-dismiss.test.ts` — vitest-тест с фейковыми таймерами на трёх кейсах: dispatch через 5s, отсутствие dispatch при `null`, реcет таймера при новом тексте.

**Modify:**
- `src/sections/campaigns/workflow-section.tsx` — удалить блок `<AnimatePresence>{aiReply && ...}</AnimatePresence>` (строки 311–347), `useEffect` auto-dismiss (105–114), `aiReplyTimerRef` (строка 50), `aiReply` из destructure (строка 39), константу `AI_REPLY_TIMEOUT_MS` (строка 29) и неиспользуемые после правки импорты `AnimatePresence`, `motion`, `X`, `Image`.
- `src/sections/shell/shell-bottom-bar.tsx` — внутри `slot` добавить `<AnimatePresence>` с `aiReply` motion.div (mascot + текст, key=`"ai-reply"`); подключить новый хук `useAiReplyAutoDismiss`; добавить импорт `AnimatePresence` (уже импортирован `motion` — добавить второй экспорт из той же строки).

---

## Task 0: Создать worktree

**Files:** none (setup)

- [ ] **Step 1: Создать worktree и ветку**

Run из корня репозитория (`/home/user/afina-ai-first`):

```bash
git worktree add .worktrees/ai-reply-unification -b feature/ai-reply-unification main
cd .worktrees/ai-reply-unification
npm install
```

- [ ] **Step 2: Убедиться, что baseline зелёный**

```bash
npm test
npm run lint
```

Expected: оба зелёные.

**Все последующие шаги выполняются внутри `.worktrees/ai-reply-unification/`.**

---

# ФАЗА 1 — Выделить auto-dismiss таймер в отдельный хук (TDD)

## Task 1: Хук `useAiReplyAutoDismiss` — failing-тесты

**Files:**
- Create: `src/sections/shell/use-ai-reply-auto-dismiss.test.ts`

- [ ] **Step 1: Создать failing-тест**

Создать файл `src/sections/shell/use-ai-reply-auto-dismiss.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAiReplyAutoDismiss } from "./use-ai-reply-auto-dismiss";

describe("useAiReplyAutoDismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches ai_reply_dismissed after 5000ms when aiReply is non-null", () => {
    const dispatch = vi.fn();
    renderHook(() => useAiReplyAutoDismiss("Готово", dispatch));

    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4999);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "ai_reply_dismissed" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch when aiReply is null", () => {
    const dispatch = vi.fn();
    renderHook(() => useAiReplyAutoDismiss(null, dispatch));

    vi.advanceTimersByTime(10000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("resets the timer when aiReply text changes mid-cycle", () => {
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ reply }: { reply: string | null }) =>
        useAiReplyAutoDismiss(reply, dispatch),
      { initialProps: { reply: "Думаю..." } }
    );

    // 3 seconds pass — timer would have 2 seconds left.
    vi.advanceTimersByTime(3000);
    expect(dispatch).not.toHaveBeenCalled();

    // New text arrives — timer must reset to a fresh 5 seconds.
    rerender({ reply: "Готово, обновил ноду" });

    // Old timer would have fired at +2000ms; new timer must not fire yet.
    vi.advanceTimersByTime(4999);
    expect(dispatch).not.toHaveBeenCalled();

    // 5000ms after the second text → dismiss.
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "ai_reply_dismissed" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("clears the pending timer on unmount", () => {
    const dispatch = vi.fn();
    const { unmount } = renderHook(() =>
      useAiReplyAutoDismiss("Готово", dispatch)
    );

    vi.advanceTimersByTime(2000);
    unmount();
    vi.advanceTimersByTime(10000);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить тест — падает**

```bash
npm test -- use-ai-reply-auto-dismiss
```

Expected: FAIL — модуль `./use-ai-reply-auto-dismiss` не существует.

- [ ] **Step 3: Создать `src/sections/shell/use-ai-reply-auto-dismiss.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";
import type { Action } from "@/state/app-state";

const AI_REPLY_TIMEOUT_MS = 5000;

/**
 * Auto-dismisses the AI reply 5 seconds after it appears. A new reply arriving
 * mid-cycle resets the timer so the user gets a full 5 seconds with the latest
 * text. Unmount clears the pending timer.
 *
 * Decoupled from React-context plumbing for testability: caller supplies the
 * current `aiReply` value and a `dispatch` function — the hook is a pure
 * timer wrapper.
 */
export function useAiReplyAutoDismiss(
  aiReply: string | null,
  dispatch: (action: Action) => void
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!aiReply) return;
    timerRef.current = setTimeout(() => {
      dispatch({ type: "ai_reply_dismissed" });
    }, AI_REPLY_TIMEOUT_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [aiReply, dispatch]);
}
```

- [ ] **Step 4: Запустить тест — все зелёные**

```bash
npm test -- use-ai-reply-auto-dismiss
```

Expected: PASS (4 теста).

Если падает с ошибкой про `@testing-library/react` not found, установить dev-зависимость:

```bash
npm install --save-dev @testing-library/react@^16 @testing-library/dom@^10 jsdom@^25
```

И обновить `vitest.config.ts` — поменять `environment: "node"` на `environment: "jsdom"` для этого теста через локальную пометку. Простейший способ: добавить в test-файл сверху директиву

```ts
// @vitest-environment jsdom
```

Перезапустить:

```bash
npm test -- use-ai-reply-auto-dismiss
```

Expected: PASS.

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 6: Коммит**

```bash
git add src/sections/shell/use-ai-reply-auto-dismiss.ts src/sections/shell/use-ai-reply-auto-dismiss.test.ts
git commit -m "feat(shell): add useAiReplyAutoDismiss hook with timer tests"
```

Если в Step 4 пришлось ставить `@testing-library/react` и/или править `vitest.config.ts`, включить эти изменения в этот же коммит:

```bash
git add package.json package-lock.json vitest.config.ts
git commit --amend --no-edit
```

---

# ФАЗА 2 — Перенести рендер в ShellBottomBar

## Task 2: Добавить `aiReply` motion.div в slot и подключить хук

**Files:**
- Modify: `src/sections/shell/shell-bottom-bar.tsx`

- [ ] **Step 1: Обновить импорты в `src/sections/shell/shell-bottom-bar.tsx`**

Найти строку:

```ts
import { motion } from "motion/react";
```

Заменить на:

```ts
import { AnimatePresence, motion } from "motion/react";
```

Под блоком импортов из `./prompt-bar` добавить импорт нового хука:

```ts
import { useAiReplyAutoDismiss } from "./use-ai-reply-auto-dismiss";
```

- [ ] **Step 2: Подключить хук внутри `ShellBottomBar`**

Найти внутри `ShellBottomBar` строки:

```ts
  const state = useAppState();
  const dispatch = useAppDispatch();
  const {
    view,
    selectedWorkflowNode,
    campaigns,
    wizardCurrentStep,
    budgetHelpShown,
  } = state;
```

Заменить деструктуризацию `state` так, чтобы вытащить ещё `aiReply`, и сразу под ней вызвать хук:

```ts
  const state = useAppState();
  const dispatch = useAppDispatch();
  const {
    view,
    selectedWorkflowNode,
    campaigns,
    wizardCurrentStep,
    budgetHelpShown,
    aiReply,
  } = state;
  useAiReplyAutoDismiss(aiReply, dispatch);
```

- [ ] **Step 3: Добавить рендер `aiReply` в `slot`**

Найти текущий блок `slot={...}` в `<PromptBar ...>`:

```tsx
        slot={
          <>
            <DraftQueueList variant="compact" onTakeDraft={() => {}} />
            {view.kind === "guided-signal" &&
            wizardCurrentStep === 5 &&
            budgetHelpShown ? (
              <motion.div
                key="budget-help-answer"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                data-testid="budget-help-answer"
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
              >
                <Image
                  src="/mascot-icon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <span className="leading-snug">
                  Рекомендуемая сумма рассчитана из размера вашей базы и средних
                  цен по сегментам. Мы заложили её так, чтобы хватило на полный
                  цикл сбора сигналов без перерасхода — обычно это 5–35% от
                  размера базы в рублях.
                </span>
              </motion.div>
            ) : undefined}
          </>
        }
```

Заменить целиком на:

```tsx
        slot={
          <>
            <DraftQueueList variant="compact" onTakeDraft={() => {}} />
            <AnimatePresence initial={false}>
              {aiReply ? (
                <motion.div
                  key="ai-reply"
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                  role="status"
                  aria-live="polite"
                  data-testid="ai-reply-slot"
                  className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
                >
                  <Image
                    src="/mascot-icon.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 leading-snug">{aiReply}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {view.kind === "guided-signal" &&
            wizardCurrentStep === 5 &&
            budgetHelpShown ? (
              <motion.div
                key="budget-help-answer"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                data-testid="budget-help-answer"
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
              >
                <Image
                  src="/mascot-icon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <span className="leading-snug">
                  Рекомендуемая сумма рассчитана из размера вашей базы и средних
                  цен по сегментам. Мы заложили её так, чтобы хватило на полный
                  цикл сбора сигналов без перерасхода — обычно это 5–35% от
                  размера базы в рублях.
                </span>
              </motion.div>
            ) : undefined}
          </>
        }
```

Notes на дизайн:
- Используется тот же фон/бордер/spacing, что у `budget-help-answer` — единый «glass» паттерн «Афина ИИ» из спеки.
- `key="ai-reply"` стабильный → при новом тексте `motion.div` остаётся смонтированным, текст внутри `<span>` просто меняется. Это правильное поведение для «Думаю...» → «Готово, обновил ноду» (одна непрерывная карточка), и одновременно useEffect в хуке ресетит таймер.
- Кнопки «×» нет (по решению развилки в спеке §3.4).
- Маскот появляется функционально — индикатор AI-вмешательства, как требует PRODUCT.md (принцип «маскот функционален»).

- [ ] **Step 4: Lint + тесты**

```bash
npm test
npm run lint
```

Expected: всё зелёное. (`Image` уже импортирован в этом файле — `import Image from "next/image";` строка 7 — отдельно добавлять не нужно.)

- [ ] **Step 5: Коммит**

```bash
git add src/sections/shell/shell-bottom-bar.tsx
git commit -m "feat(shell): render aiReply in PromptBar slot with auto-dismiss"
```

---

# ФАЗА 3 — Удалить старый floating bubble из workflow-section

## Task 3: Очистить `workflow-section.tsx` от alert-bubble

**Files:**
- Modify: `src/sections/campaigns/workflow-section.tsx`

- [ ] **Step 1: Удалить блок `<AnimatePresence>{aiReply && ...}</AnimatePresence>`**

Найти в `src/sections/campaigns/workflow-section.tsx` блок (строки ~311–347):

```tsx
      <AnimatePresence>
        {aiReply && (
          <motion.div
            key="ai-reply"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="pointer-events-auto fixed left-[120px] right-0 z-30 px-8"
            style={{ bottom: "calc(var(--promptbar-height, 140px) + 8px)" }}
          >
            <div
              role="status"
              aria-live="polite"
              className="mx-auto flex w-full max-w-2xl items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur-sm"
            >
              <Image
                src="/mascot-icon.svg"
                alt=""
                width={16}
                height={16}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 flex-1 leading-snug">{aiReply}</span>
              <button
                type="button"
                aria-label="Закрыть ответ AI"
                onClick={() => dispatch({ type: "ai_reply_dismissed" })}
                className="-mr-1 rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
```

Удалить целиком (вместе с предшествующей пустой строкой).

- [ ] **Step 2: Удалить `useEffect` auto-dismiss**

Найти в файле блок (строки ~105–114):

```ts
  useEffect(() => {
    if (!aiReply) return;
    if (aiReplyTimerRef.current) clearTimeout(aiReplyTimerRef.current);
    aiReplyTimerRef.current = setTimeout(() => {
      dispatch({ type: "ai_reply_dismissed" });
    }, AI_REPLY_TIMEOUT_MS);
    return () => {
      if (aiReplyTimerRef.current) clearTimeout(aiReplyTimerRef.current);
    };
  }, [aiReply, dispatch]);
```

Удалить целиком.

- [ ] **Step 3: Удалить `aiReplyTimerRef` (строка ~50)**

Найти:

```ts
  const aiReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Удалить эту строку.

- [ ] **Step 4: Убрать `aiReply` из деструктуризации `useAppState()`**

Найти:

```ts
  const {
    view,
    workflowCommand,
    workflowNodeCommand,
    workflowStructuralCommands,
    workflowNodeFieldPatch,
    selectedWorkflowNode,
    aiReply,
    signals,
    campaigns,
    balance,
  } = useAppState();
```

Заменить на:

```ts
  const {
    view,
    workflowCommand,
    workflowNodeCommand,
    workflowStructuralCommands,
    workflowNodeFieldPatch,
    selectedWorkflowNode,
    signals,
    campaigns,
    balance,
  } = useAppState();
```

- [ ] **Step 5: Удалить константу `AI_REPLY_TIMEOUT_MS`**

Найти в верхней части файла:

```ts
const TOAST_TIMEOUT_MS = 3000;
const AI_REPLY_TIMEOUT_MS = 5000;
```

Заменить на:

```ts
const TOAST_TIMEOUT_MS = 3000;
```

- [ ] **Step 6: Подчистить импорты**

Найти в верхней части файла:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import Image from "next/image";
```

Заменить на:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
```

Notes:
- `AnimatePresence` и `motion` больше нигде не используются в файле (проверено: они появлялись только в удалённом блоке).
- `X` больше не нужен — кнопка закрытия удалена.
- `Image` больше нигде в файле не используется (mascot был только в bubble).
- `useEffect`, `useRef`, `useState` остаются — они используются в других местах (`useEffect` для node-commands snapshot, `useRef` для `graphRef` / `toastTimerRef`, `useState` для `graphTick` / `toast` / `topUpOpen`).

- [ ] **Step 7: Lint + тесты**

```bash
npm test
npm run lint
```

Expected: всё зелёное. Если lint ругается на `unused vars` — значит остался какой-то символ из шагов 1–6; перепроверить и удалить.

- [ ] **Step 8: Коммит**

```bash
git add src/sections/campaigns/workflow-section.tsx
git commit -m "refactor(workflow): remove floating aiReply bubble (moved into PromptBar slot)"
```

---

# ФАЗА 4 — Ручная верификация и edge-cases

## Task 4: Manual smoke test всех сценариев

**Files:** none

- [ ] **Step 1: Запустить dev-сервер**

Из `.worktrees/ai-reply-unification`:

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/ai-reply-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200.

- [ ] **Step 2: Базовый сценарий (workflow editor)**

В браузере на `http://localhost:3001`:

1. Через dev-панель применить пресет с draft-кампанией (например, `mid`).
2. Открыть workflow editor draft-кампании.
3. Кликнуть на SMS-ноду → в PromptBar появится chip ноды → ввести «Привет {name}» → нажать Enter.
4. **Ожидание:** «Думаю...» появляется в слоте PromptBar (стеклянная карточка с mascot, фон `bg-white/5`, бордер `border-white/10`), **не** за PromptBar. Карточка размещена между шапкой «Афина ИИ» и инпутом, рядом с draft-queue (если он есть).
5. Через ~3–5 секунд текст в той же карточке заменяется на финальный ответ (например «Готово, обновил ноду»).
6. Через 5 секунд после финального ответа карточка исчезает с fade-out + slide-down.
7. Старого floating bubble c кнопкой «×» нигде нет — ни в workflow editor, ни на других экранах.

- [ ] **Step 3: Edge case — несколько dispatch'ей подряд**

1. В workflow editor снова кликнуть ноду и ввести команду.
2. Сразу же (пока «Думаю...» ещё в слоте) кликнуть другую ноду и отправить команду.
3. **Ожидание:** текст в слоте обновляется. Auto-dismiss таймер ресетится — карточка не исчезает на 5-й секунде первой команды, а только через 5 секунд после последнего обновления.

- [ ] **Step 4: Edge case — drawer mode**

1. Открыть workflow editor с активным aiReply («Думаю...» в слоте).
2. Нажать кнопку открытия drawer (`PanelRightOpen` в шапке PromptBar).
3. **Ожидание:** ShellBottomBar исчезает (drawer показывает свой композер). Через 5 секунд после показа aiReply state.aiReply очищается (хук всё ещё смонтирован до момента, пока BottomBarSlot не вернёт null — это происходит синхронно после `chat.openSidebar`). Если хук размонтировался слишком быстро, чтобы поставить таймер, — это безопасно: aiReply просто останется в state, но не виден (нечем рендерить); при возврате из drawer слот его покажет и хук стартанёт таймер заново. На практике для прототипа это приемлемое поведение.

Если в ходе теста замечено, что aiReply «застревает» при переключении drawer (например, при возврате старый текст всё ещё виден дольше 5 секунд) — поправить позже отдельным коммитом (вынести хук на уровень `BottomBarSlot` или `Home`), но в рамках этого блока такая правка не требуется.

- [ ] **Step 5: Проверка других секций**

1. Перейти в раздел «Кампании» через сайдбар.
2. **Ожидание:** Никаких побочных эффектов — aiReply там не возникает (нет dispatch'а), слот PromptBar не показывает AI-карточку.
3. Перейти в `campaign-screen` (открыть запущенную кампанию из feed).
4. **Ожидание:** То же — слот не показывает AI-карточку без dispatch'а.

- [ ] **Step 6: Проверка budget-help соседства**

1. Открыть guided-signal wizard.
2. Дойти до шага 5 (бюджет).
3. Нажать чип «Как рассчитывается рекомендуемый бюджет?» → появится `budget-help-answer` карточка в слоте.
4. **Ожидание:** budget-help-answer работает как раньше (не сломан добавлением AnimatePresence над ним). Если в этом сценарии случайно стрельнул aiReply — обе карточки видны друг под другом, без перекрытия.

- [ ] **Step 7: Если всё ок — финальный коммит (или без коммита, если правок не было)**

Если на любом шаге выявились баги — фиксить и коммитить отдельно:

```bash
git add -A
git commit -m "fix(shell): <конкретное описание правки>"
```

Если правок не понадобилось — пропустить.

- [ ] **Step 8: Остановить dev-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

---

# ФАЗА 5 — Финальная верификация

## Task 5: Acceptance-criteria checklist

**Files:** none

- [ ] **Step 1: Полный прогон тестов и линта**

```bash
npm test
npm run lint
```

Expected: оба зелёные.

- [ ] **Step 2: Сверка с acceptance criteria из спеки §5**

Открыть `docs/superpowers/specs/2026-05-21-ai-reply-unification-design.md` и убедиться, что:

- [ ] Alert-bubble за PromptBar удалён — `grep -n "AnimatePresence\|aiReply" src/sections/campaigns/workflow-section.tsx` ничего не находит.
- [ ] Ответ нейронки в кампаниях выводится в стеклянной оболочке над PromptBar (паттерн «Афина ИИ») — `data-testid="ai-reply-slot"` присутствует в `shell-bottom-bar.tsx`.
- [ ] Auto-dismiss через 5 секунд работает — покрыто тестом в Task 1, проверено вручную в Task 4 Step 2.
- [ ] Анимация входа (slide+fade) присутствует — `motion.div` с `initial={{ y: 6, opacity: 0 }}` / `animate={{ y: 0, opacity: 1 }}` в `shell-bottom-bar.tsx`.
- [ ] Кнопки «×» нет — `grep "ai_reply_dismissed" src/sections/campaigns/workflow-section.tsx` ничего не находит; в `shell-bottom-bar.tsx` диспатч происходит только из хука, не из onClick.

Выполнить грепы:

```bash
grep -n "AnimatePresence\|aiReply" src/sections/campaigns/workflow-section.tsx || echo "OK: workflow-section clean"
grep -n "ai-reply-slot" src/sections/shell/shell-bottom-bar.tsx
grep -n "ai_reply_dismissed" src/sections/campaigns/workflow-section.tsx || echo "OK: no manual dismiss in workflow-section"
```

Expected:
- Первая команда — `OK: workflow-section clean`.
- Вторая — выводит строку с `data-testid="ai-reply-slot"`.
- Третья — `OK: no manual dismiss in workflow-section`.

- [ ] **Step 3: Отчитаться о готовности**

Сообщить пользователю:
- Ветка: `feature/ai-reply-unification`
- Worktree: `.worktrees/ai-reply-unification`
- Количество коммитов на ветке: `git log --oneline main..HEAD | wc -l`
- Что осталось: мерж/PR (решает пользователь).
