# Экран оплаты кампании — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кнопка «Запустить» в canvas-header больше не запускает кампанию напрямую, а ведёт на новый экран оплаты кампании (`CampaignPaymentScreen`), идентичный по визуальному паттерну экрану оплаты в визарде сигналов. На экране — выбор бюджета (рекомендуемая / своя сумма), прогноз касаний, проверка баланса, кнопка «Запустить» / «Пополнить и запустить». TopUpModal остаётся fallback'ом из экрана оплаты.

**Architecture:** Снизу вверх. Сначала чистая TDD-надстройка над reducer'ом (новый view kind, новый action, расширение `campaign_launched` полем `budget`, расширение `ViewAddress`). Затем TDD-юнит для прогноза касаний и рекомендуемого бюджета (чистые функции). Затем сам визуальный компонент `CampaignPaymentScreen` (визуальный паттерн копируем со step-5 и step-6 — сознательное дублирование, см. spec §7 и §8). В конце — wiring `handleLaunch` в `workflow-section.tsx` и подключение view в `page.tsx`. Каждая задача — атомарный коммит; `npm test` и `npm run lint` после каждого изменения.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, vitest (reducer + pure-function тесты), motion/react v12 (нигде не нужна на этом блоке, переходы view — мгновенные по решению из spec §3.7).

**Spec:** `docs/superpowers/specs/2026-05-21-campaign-payment-screen-design.md`
**Ветка/воркстри:** `feature/campaign-payment-screen` / `.worktrees/campaign-payment-screen`

---

## File Structure

**Create:**
- `src/sections/campaigns/campaign-payment-screen.tsx` — новый view-компонент (UI + локальный budget-state + ветка TopUpModal).
- `src/sections/campaigns/campaign-payment-math.ts` — чистые функции `recommendCampaignBudget`, `estimateTouches`, константа `COST_PER_TOUCH`. Выделены в отдельный модуль, чтобы покрыть юнит-тестами без поднятия React.
- `src/sections/campaigns/campaign-payment-math.test.ts` — TDD-юнит-тесты математики.

**Modify:**
- `src/state/app-state.ts` — расширить `View`, `ViewAddress`, `Campaign`, `Action`; добавить reducer-кейс `open_campaign_payment`; расширить `campaign_launched` полем `budget`; расширить `viewToAddress` и `rebuildViewFromAddress` для нового kind.
- `src/state/app-state.test.ts` — добавить тесты для `open_campaign_payment` (happy + miss), для `campaign_launched` c `budget`, для round-trip `viewToAddress`/`rebuildViewFromAddress` по новому kind.
- `src/sections/campaigns/workflow-section.tsx` — `handleLaunch` диспатчит `open_campaign_payment` вместо shortfall-логики; удалить `CAMPAIGN_LAUNCH_COST`, `topUpOpen`, `handleCampaignTopUpSuccess`, `<TopUpModal>` рендер и связанные импорты (`TopUpModal`, `computeShortfall`).
- `src/app/page.tsx` — добавить рендер `<CampaignPaymentScreen />` при `view.kind === "campaign-payment"`.

**Untouched (по спеке §7):**
- `src/sections/signals/top-up-modal.tsx` — без изменений, переиспользуется новым экраном.
- `src/sections/signals/steps/step-5-limit.tsx`, `step-6-summary.tsx` — без изменений.
- `src/sections/campaigns/canvas-header.tsx` — без изменений (кнопка «Запустить» уже зовёт `onLaunch`, мы меняем только что делает `handleLaunch` в parent'е).
- `src/sections/campaigns/campaign-screen.tsx` — без изменений (отображение «150 000 ₽» — задача другого блока).

---

## Task 0: Worktree setup

**Files:** none (setup)

- [ ] **Step 1: Создать worktree и ветку**

Run из корня репозитория (`/home/user/afina-ai-first`):

```bash
git worktree add .worktrees/campaign-payment-screen -b feature/campaign-payment-screen main
cd .worktrees/campaign-payment-screen
npm install
```

- [ ] **Step 2: Убедиться, что baseline зелёный**

```bash
npm test
npm run lint
```

Expected: оба зелёные. Если падают — НЕ начинать работу, разобраться с baseline.

**Все последующие шаги выполняются внутри `.worktrees/campaign-payment-screen/`.** Если в задаче запускается `npm run dev`, использовать порт `-p 3001` (порт 3000 может держать главный чек-аут).

---

# ФАЗА 1 — State (reducer + типы)

## Task 1: Добавить `campaign-payment` view kind и action `open_campaign_payment` (TDD)

**Files:**
- Modify: `src/state/app-state.ts`
- Modify: `src/state/app-state.test.ts`

- [ ] **Step 1: Написать failing-тесты**

Добавить в конец `src/state/app-state.test.ts` (перед последним `});` файла) новый describe-блок:

```ts
describe("appReducer — open_campaign_payment", () => {
  it("switches view to campaign-payment for an existing campaign", () => {
    const c = makeCampaign({ id: "cmp_A", name: "C" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, {
      type: "open_campaign_payment",
      campaignId: "cmp_A",
    });
    expect(next.view).toEqual({
      kind: "campaign-payment",
      campaign: { id: "cmp_A", name: "C" },
    });
  });

  it("is a no-op for unknown campaignId", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "cmp_A" })],
    };
    const next = appReducer(state, {
      type: "open_campaign_payment",
      campaignId: "cmp_unknown",
    });
    expect(next).toBe(state);
  });

  it("preserves campaigns and signals arrays untouched", () => {
    const c = makeCampaign({ id: "cmp_A", name: "C" });
    const s = makeSignal({ id: "sig_1" });
    const state: AppState = {
      ...initialState,
      campaigns: [c],
      signals: [s],
    };
    const next = appReducer(state, {
      type: "open_campaign_payment",
      campaignId: "cmp_A",
    });
    expect(next.campaigns).toBe(state.campaigns);
    expect(next.signals).toBe(state.signals);
  });
});
```

- [ ] **Step 2: Запустить тесты — должны падать**

```bash
npm test -- app-state
```

Expected: FAIL — action `open_campaign_payment` не существует; view kind `campaign-payment` неизвестен TypeScript.

- [ ] **Step 3: Расширить `View` в `src/state/app-state.ts`**

Найти определение `View` (около строки 88):

```ts
export type View =
  | { kind: "welcome" }
  | { kind: "guided-signal"; initialScenario?: { id: string; name: string } }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  | { kind: "workflow"; campaign: { id: string; name: string }; launched: boolean }
  | { kind: "campaign"; campaign: { id: string; name: string } }
  | { kind: "section"; name: SectionName; campaignId?: string };
```

Заменить на:

```ts
export type View =
  | { kind: "welcome" }
  | { kind: "guided-signal"; initialScenario?: { id: string; name: string } }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  | { kind: "workflow"; campaign: { id: string; name: string }; launched: boolean }
  | { kind: "campaign-payment"; campaign: { id: string; name: string } }
  | { kind: "campaign"; campaign: { id: string; name: string } }
  | { kind: "section"; name: SectionName; campaignId?: string };
```

- [ ] **Step 4: Добавить action `open_campaign_payment` в `Action`-юнион**

В `src/state/app-state.ts` найти конец `Action`-юниона (около строки 235). Перед строкой `| { type: "open_workflow"; campaign: { id: string; name: string }; launched: boolean };` оставить как есть, и **сразу после неё** (перед комментарием `// PARALLEL-WORKTREE INSERTION POINT`) добавить:

```ts
  | { type: "open_campaign_payment"; campaignId: string };
```

Так чтобы итоговая последовательность была:

```ts
  | { type: "campaign_launched"; id: string; timestamp: string }
  | { type: "open_workflow"; campaign: { id: string; name: string }; launched: boolean }
  | { type: "open_campaign_payment"; campaignId: string };
// PARALLEL-WORKTREE INSERTION POINT — …
```

Заметка: TypeScript не позволит точку с запятой посреди union — финальную `;` оставляем только на последнем варианте. Соответственно сначала надо превратить `};` после `open_workflow` в просто новую строку с `|`. Финальный вид:

```ts
  | { type: "campaign_launched"; id: string; timestamp: string }
  | { type: "open_workflow"; campaign: { id: string; name: string }; launched: boolean }
  | { type: "open_campaign_payment"; campaignId: string };
```

(точка с запятой остаётся только в конце последнего варианта).

- [ ] **Step 5: Добавить reducer-case `open_campaign_payment`**

В `src/state/app-state.ts` найти `case "open_workflow":` (около строки 788). **Сразу перед** комментарием `// PARALLEL-WORTREE INSERTION POINT — append survey/billing/signal-status cases` добавить новый кейс:

```ts
    case "open_campaign_payment": {
      const c = state.campaigns.find((cc) => cc.id === action.campaignId);
      if (!c) return state;
      return {
        ...state,
        view: {
          kind: "campaign-payment",
          campaign: { id: c.id, name: c.name },
        },
      };
    }
```

- [ ] **Step 6: Запустить тесты — должны проходить**

```bash
npm test -- app-state
```

Expected: PASS — все три новых теста зелёные, остальные не сломаны.

- [ ] **Step 7: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 8: Коммит**

```bash
git add src/state/app-state.ts src/state/app-state.test.ts
git commit -m "feat(state): add campaign-payment view kind and open_campaign_payment action"
```

---

## Task 2: Расширить `ViewAddress` + round-trip (TDD)

**Files:**
- Modify: `src/state/app-state.ts`
- Modify: `src/state/app-state.test.ts`

`ViewAddress` нужен, чтобы refresh страницы на экране оплаты восстанавливал view (см. spec §4 "Refresh страницы" и §8).

- [ ] **Step 1: Написать failing-тесты для round-trip**

Добавить новый describe в `src/state/app-state.test.ts` (после блока с `open_campaign_payment`):

```ts
describe("ViewAddress — campaign-payment round-trip", () => {
  it("viewToAddress maps campaign-payment view to address", () => {
    const view: View = {
      kind: "campaign-payment",
      campaign: { id: "cmp_A", name: "C" },
    };
    expect(viewToAddress(view)).toEqual({
      kind: "campaign-payment",
      campaignId: "cmp_A",
    });
  });

  it("restore_address rebuilds campaign-payment view from address", () => {
    const c = makeCampaign({ id: "cmp_A", name: "C" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, {
      type: "restore_address",
      address: { kind: "campaign-payment", campaignId: "cmp_A" },
    });
    expect(next.view).toEqual({
      kind: "campaign-payment",
      campaign: { id: "cmp_A", name: "C" },
    });
  });

  it("restore_address falls back to Кампании when campaign id is gone", () => {
    const state: AppState = { ...initialState, campaigns: [] };
    const next = appReducer(state, {
      type: "restore_address",
      address: { kind: "campaign-payment", campaignId: "cmp_missing" },
    });
    expect(next.view).toEqual({ kind: "section", name: "Кампании" });
  });
});
```

И добавить нужные импорты в начало файла. Сейчас импорт выглядит так (строки 1–9):

```ts
import { describe, it, expect } from "vitest";
import {
  appReducer,
  initialState,
  isCampaignDone,
  type AppState,
  type Signal,
  type Campaign,
} from "./app-state";
```

Заменить на:

```ts
import { describe, it, expect } from "vitest";
import {
  appReducer,
  initialState,
  isCampaignDone,
  viewToAddress,
  type AppState,
  type Signal,
  type Campaign,
  type View,
} from "./app-state";
```

- [ ] **Step 2: Запустить тесты — падают**

```bash
npm test -- app-state
```

Expected: FAIL — `ViewAddress` не имеет варианта `campaign-payment`; `viewToAddress` и `rebuildViewFromAddress` не покрывают новый kind.

- [ ] **Step 3: Расширить `ViewAddress`**

В `src/state/app-state.ts` найти определение `ViewAddress` (около строки 101). Заменить:

```ts
export type ViewAddress =
  | { kind: "welcome" }
  | { kind: "guided-signal"; scenarioId?: string; scenarioName?: string }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  | { kind: "workflow"; campaignId: string }
  | { kind: "campaign"; campaignId: string }
  | { kind: "section"; name: SectionName; campaignId?: string };
```

На:

```ts
export type ViewAddress =
  | { kind: "welcome" }
  | { kind: "guided-signal"; scenarioId?: string; scenarioName?: string }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  | { kind: "workflow"; campaignId: string }
  | { kind: "campaign-payment"; campaignId: string }
  | { kind: "campaign"; campaignId: string }
  | { kind: "section"; name: SectionName; campaignId?: string };
```

- [ ] **Step 4: Расширить `viewToAddress`**

В `src/state/app-state.ts` найти `function viewToAddress(view: View): ViewAddress { switch (view.kind) { ... } }` (около строки 842). В `switch` добавить новую ветку — между `case "workflow":` и `case "campaign":`:

```ts
    case "campaign-payment":
      return { kind: "campaign-payment", campaignId: view.campaign.id };
```

Финальный фрагмент должен выглядеть так:

```ts
    case "workflow":
      return { kind: "workflow", campaignId: view.campaign.id };
    case "campaign-payment":
      return { kind: "campaign-payment", campaignId: view.campaign.id };
    case "campaign":
      return { kind: "campaign", campaignId: view.campaign.id };
```

- [ ] **Step 5: Расширить `rebuildViewFromAddress`**

В `src/state/app-state.ts` найти `function rebuildViewFromAddress(addr: ViewAddress, campaigns: Campaign[]): View { switch (addr.kind) { ... } }` (около строки 802). Между `case "workflow": { ... }` и `case "campaign": { ... }` добавить:

```ts
    case "campaign-payment": {
      const c = campaigns.find((cc) => cc.id === addr.campaignId);
      // Mirror the existing "workflow"/"campaign" fallback: if the campaign
      // disappeared (e.g. preset was reapplied), drop to the campaigns list
      // rather than rendering an empty payment screen.
      if (!c) return { kind: "section", name: "Кампании" };
      return {
        kind: "campaign-payment",
        campaign: { id: c.id, name: c.name },
      };
    }
```

- [ ] **Step 6: Запустить тесты — должны проходить**

```bash
npm test -- app-state
```

Expected: PASS — все три новых round-trip теста зелёные, ранее зелёные остаются такими.

- [ ] **Step 7: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 8: Коммит**

```bash
git add src/state/app-state.ts src/state/app-state.test.ts
git commit -m "feat(state): extend ViewAddress with campaign-payment for refresh restore"
```

---

## Task 3: Расширить `campaign_launched` полем `budget` (TDD)

**Files:**
- Modify: `src/state/app-state.ts`
- Modify: `src/state/app-state.test.ts`

Spec §3.3 — `campaign_launched` теперь принимает `budget: number` и сохраняет его в campaign. `Campaign.budget?: number` — опциональное (старые preset-кампании могут не иметь).

- [ ] **Step 1: Написать failing-тесты**

В `src/state/app-state.test.ts` найти существующий блок `describe("appReducer — launched campaign screen", ...)` (около строки 464). **Сразу после** теста `"campaign_launched is a no-op for unknown id"` (но перед закрывающим `});`) добавить:

```ts
  it("campaign_launched stores the provided budget on the campaign", () => {
    const c = makeCampaign({ id: "cmp_A", name: "C", status: "draft" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, {
      type: "campaign_launched",
      id: "cmp_A",
      timestamp: "2026-05-20T00:00:00.000Z",
      budget: 1234.56,
    });
    const updated = next.campaigns.find((x) => x.id === "cmp_A");
    expect(updated?.budget).toBe(1234.56);
    expect(updated?.status).toBe("active");
  });

  it("campaign_launched preserves an existing budget if none is provided", () => {
    // Action shape requires budget after this change — but if a future caller
    // passes 0 or omits it via TS, we don't erase a previously-stored value.
    const c = makeCampaign({ id: "cmp_A", name: "C", status: "draft", budget: 999 });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, {
      type: "campaign_launched",
      id: "cmp_A",
      timestamp: "2026-05-20T00:00:00.000Z",
      budget: 0,
    });
    const updated = next.campaigns.find((x) => x.id === "cmp_A");
    // Zero-budget launches keep the previously-stored value.
    expect(updated?.budget).toBe(999);
  });
```

И обновить существующий тест `"campaign_launched sets active + launchedAt and navigates to campaign view"` — добавить `budget` в action. Найти:

```ts
    const next = appReducer(state, {
      type: "campaign_launched",
      id: "cmp_A",
      timestamp: "2026-05-20T00:00:00.000Z",
    });
```

Заменить на:

```ts
    const next = appReducer(state, {
      type: "campaign_launched",
      id: "cmp_A",
      timestamp: "2026-05-20T00:00:00.000Z",
      budget: 500,
    });
```

И тест `"campaign_launched is a no-op for unknown id"` — найти:

```ts
    const next = appReducer(state, {
      type: "campaign_launched",
      id: "cmp_unknown",
      timestamp: "t",
    });
```

Заменить на:

```ts
    const next = appReducer(state, {
      type: "campaign_launched",
      id: "cmp_unknown",
      timestamp: "t",
      budget: 500,
    });
```

- [ ] **Step 2: Запустить тесты — падают**

```bash
npm test -- app-state
```

Expected: FAIL — action `campaign_launched` не принимает `budget`; поле `budget` нет в типе `Campaign`.

- [ ] **Step 3: Добавить `budget?: number` в `Campaign`**

В `src/state/app-state.ts` найти тип `Campaign` (около строки 67):

```ts
export type Campaign = {
  id: string;
  name: string;
  signalId: string;
  status: CampaignStatus;
  createdAt: string;
  launchedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
};
```

Заменить на:

```ts
export type Campaign = {
  id: string;
  name: string;
  signalId: string;
  status: CampaignStatus;
  createdAt: string;
  launchedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
  /**
   * Set by `campaign_launched` from the payment screen. Older preset
   * campaigns and never-launched drafts may not carry it. Display fallbacks
   * (campaign-screen) keep working when the field is absent.
   */
  budget?: number;
};
```

- [ ] **Step 4: Расширить action `campaign_launched`**

В `src/state/app-state.ts` найти в `Action`-юнионе (около строки 234):

```ts
  | { type: "campaign_launched"; id: string; timestamp: string }
```

Заменить на:

```ts
  | { type: "campaign_launched"; id: string; timestamp: string; budget: number }
```

- [ ] **Step 5: Обновить reducer-case `campaign_launched`**

В `src/state/app-state.ts` найти `case "campaign_launched": { ... }` (около строки 769):

```ts
    case "campaign_launched": {
      const c = state.campaigns.find((cc) => cc.id === action.id);
      if (!c) return state;
      return {
        ...state,
        campaigns: state.campaigns.map((cc) =>
          cc.id === action.id
            ? {
                ...cc,
                status: "active",
                launchedAt: cc.launchedAt ?? action.timestamp,
              }
            : cc
        ),
        view: { kind: "campaign", campaign: { id: c.id, name: c.name } },
        activeSection: null,
      };
    }
```

Заменить на:

```ts
    case "campaign_launched": {
      const c = state.campaigns.find((cc) => cc.id === action.id);
      if (!c) return state;
      return {
        ...state,
        campaigns: state.campaigns.map((cc) =>
          cc.id === action.id
            ? {
                ...cc,
                status: "active",
                launchedAt: cc.launchedAt ?? action.timestamp,
                // A real budget overwrites; a 0 (e.g. weird re-dispatch) keeps
                // the previously-stored value.
                budget: action.budget > 0 ? action.budget : cc.budget,
              }
            : cc
        ),
        view: { kind: "campaign", campaign: { id: c.id, name: c.name } },
        activeSection: null,
      };
    }
```

- [ ] **Step 6: Запустить тесты — должны проходить**

```bash
npm test -- app-state
```

Expected: PASS — все тесты блока `launched campaign screen` зелёные.

- [ ] **Step 7: Найти и починить все остальные дисптачи `campaign_launched`**

Action shape сменился — все каллеры должны передавать `budget`. Найти их:

```bash
grep -rn 'type: "campaign_launched"' src/
```

Ожидаемые места:
- `src/sections/campaigns/workflow-section.tsx` (две точки: `handleLaunch` и `handleCampaignTopUpSuccess`) — они будут удалены в Task 6, но **временно** до Task 6 нужно компилироваться. Добавить `budget: 0` к обоим дисптачам как stub:

В `src/sections/campaigns/workflow-section.tsx` найти первый dispatch (около строки 183):

```ts
    dispatch({
      type: "campaign_launched",
      id: currentCampaign.id,
      timestamp: new Date().toISOString(),
    });
```

Заменить на:

```ts
    dispatch({
      type: "campaign_launched",
      id: currentCampaign.id,
      timestamp: new Date().toISOString(),
      budget: 0, // TODO: replaced when handleLaunch routes to payment screen
    });
```

И второй dispatch (около строки 193, в `handleCampaignTopUpSuccess`):

```ts
    dispatch({
      type: "campaign_launched",
      id: currentCampaign.id,
      timestamp: new Date().toISOString(),
    });
```

Заменить на:

```ts
    dispatch({
      type: "campaign_launched",
      id: currentCampaign.id,
      timestamp: new Date().toISOString(),
      budget: 0, // TODO: replaced when handleLaunch routes to payment screen
    });
```

Эти заглушки уйдут в Task 6 вместе со всем shortfall-блоком.

- [ ] **Step 8: Tests + lint**

```bash
npm test
npm run lint
```

Expected: всё зелёное.

- [ ] **Step 9: Коммит**

```bash
git add src/state/app-state.ts src/state/app-state.test.ts src/sections/campaigns/workflow-section.tsx
git commit -m "feat(state): persist campaign budget through campaign_launched action"
```

---

# ФАЗА 2 — Чистая математика (TDD)

## Task 4: `campaign-payment-math.ts` — `estimateTouches` и `recommendCampaignBudget` (TDD)

**Files:**
- Create: `src/sections/campaigns/campaign-payment-math.ts`
- Create: `src/sections/campaigns/campaign-payment-math.test.ts`

Чистые функции отделены от React-компонента, чтобы юнит-тесты не тянули JSX-инфраструктуру. Логика:
- `COST_PER_TOUCH = 5` (₽ за одно персонализированное касание, mock-константа спеки §3.5).
- `estimateTouches(budget, audienceSize)` = `Math.min(audienceSize, Math.floor(budget / COST_PER_TOUCH))`, не отрицательный.
- `recommendCampaignBudget(audienceSize)` = `Math.max(50, Math.round(audienceSize * (0.05 + Math.random() * 0.4)))` — соответствует step-5-limit.tsx convention.

- [ ] **Step 1: Создать failing-тесты в `src/sections/campaigns/campaign-payment-math.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import {
  COST_PER_TOUCH,
  estimateTouches,
  recommendCampaignBudget,
} from "./campaign-payment-math";

describe("COST_PER_TOUCH", () => {
  it("equals 5", () => {
    expect(COST_PER_TOUCH).toBe(5);
  });
});

describe("estimateTouches", () => {
  it("returns 0 for budget <= 0", () => {
    expect(estimateTouches(0, 1000)).toBe(0);
    expect(estimateTouches(-50, 1000)).toBe(0);
  });

  it("returns floor(budget / COST_PER_TOUCH) when audience is large", () => {
    // 100 ₽ at 5 ₽/touch → 20 touches; audience plenty.
    expect(estimateTouches(100, 1000)).toBe(20);
  });

  it("caps at audienceSize when budget would buy more touches", () => {
    // 10 000 ₽ would buy 2000 touches at 5 ₽/touch, but audience is 1000.
    expect(estimateTouches(10000, 1000)).toBe(1000);
  });

  it("uses floor for non-divisible budgets", () => {
    // 17 ₽ / 5 ₽ = 3.4 → floor → 3.
    expect(estimateTouches(17, 1000)).toBe(3);
  });

  it("returns 0 when audienceSize is 0", () => {
    expect(estimateTouches(100, 0)).toBe(0);
  });
});

describe("recommendCampaignBudget", () => {
  it("returns at least 50 when audienceSize is 0", () => {
    // Math.random() doesn't matter here — multiplier × 0 = 0, clamped to 50.
    expect(recommendCampaignBudget(0)).toBe(50);
  });

  it("uses fixed multiplier band 0.05..0.45 of audienceSize", () => {
    // Pin random low → 0.05 × audienceSize.
    const lowSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      // 1000 × 0.05 = 50 → max(50, 50) = 50.
      expect(recommendCampaignBudget(1000)).toBe(50);
      // 10000 × 0.05 = 500 → max(50, 500) = 500.
      expect(recommendCampaignBudget(10000)).toBe(500);
    } finally {
      lowSpy.mockRestore();
    }

    // Pin random high → ~0.45 × audienceSize.
    const highSpy = vi.spyOn(Math, "random").mockReturnValue(0.999999);
    try {
      // 1000 × ~0.45 = ~450 → rounded.
      const v = recommendCampaignBudget(1000);
      expect(v).toBeGreaterThanOrEqual(449);
      expect(v).toBeLessThanOrEqual(450);
    } finally {
      highSpy.mockRestore();
    }
  });

  it("rounds to an integer", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.123);
    try {
      const v = recommendCampaignBudget(777);
      expect(Number.isInteger(v)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
```

- [ ] **Step 2: Запустить тесты — падают**

```bash
npm test -- campaign-payment-math
```

Expected: FAIL — модуль не существует.

- [ ] **Step 3: Создать `src/sections/campaigns/campaign-payment-math.ts`**

```ts
/**
 * Pure math for the campaign payment screen.
 * Mocked numbers (COST_PER_TOUCH, recommendation band) — this is a prototype,
 * not a pricing engine; see spec §3.5 and §8.
 */

/** Mock price in roubles per one personalised touch. */
export const COST_PER_TOUCH = 5;

/**
 * How many touches the active budget buys, capped at audience size.
 * Negative or zero budget → 0; zero audience → 0.
 */
export function estimateTouches(budget: number, audienceSize: number): number {
  if (budget <= 0) return 0;
  if (audienceSize <= 0) return 0;
  return Math.min(audienceSize, Math.floor(budget / COST_PER_TOUCH));
}

/**
 * Recommended budget for a campaign of the given audience size.
 * Same convention as step-5-limit.tsx: random multiplier in [0.05, 0.45],
 * floor at 50 ₽. Each call is non-deterministic (callers cache via useMemo).
 */
export function recommendCampaignBudget(audienceSize: number): number {
  return Math.max(
    50,
    Math.round(audienceSize * (0.05 + Math.random() * 0.4))
  );
}
```

- [ ] **Step 4: Запустить тесты — должны проходить**

```bash
npm test -- campaign-payment-math
```

Expected: PASS.

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 6: Коммит**

```bash
git add src/sections/campaigns/campaign-payment-math.ts src/sections/campaigns/campaign-payment-math.test.ts
git commit -m "feat(campaigns): add pure math for payment screen (touches + recommended budget)"
```

---

# ФАЗА 3 — Компонент CampaignPaymentScreen

## Task 5: Создать `CampaignPaymentScreen` (новый файл, без тестов — манульная верификация)

**Files:**
- Create: `src/sections/campaigns/campaign-payment-screen.tsx`

UI-компонент дублирует визуальные паттерны step-5 (карточки бюджета) и step-6 (блок «Стоимость / Баланс»). Spec §3.5 — это сознательное дублирование, не выносим в общий компонент. Юнит-тесты на сам визуал не пишем (см. brief: «for the new view's visual layout itself, write a manual verification step rather than fake snapshot tests»).

- [ ] **Step 1: Создать файл `src/sections/campaigns/campaign-payment-screen.tsx`**

Полный текст файла:

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { TopUpModal, computeShortfall } from "@/sections/signals/top-up-modal";
import { cn } from "@/lib/utils";
import {
  estimateTouches,
  recommendCampaignBudget,
} from "./campaign-payment-math";

type Mode = "recommended" | "custom";

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

function formatRub(n: number): string {
  return `₽ ${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}`;
}

export function CampaignPaymentScreen() {
  const { view, campaigns, signals, balance } = useAppState();
  const dispatch = useAppDispatch();

  // Hook order is fixed across renders: we always call hooks unconditionally
  // and bail to a fallback render below if view/campaign aren't right.
  const campaignFromView =
    view.kind === "campaign-payment" ? view.campaign : null;

  const campaign = campaignFromView
    ? campaigns.find((c) => c.id === campaignFromView.id) ?? null
    : null;
  const signal = campaign
    ? signals.find((s) => s.id === campaign.signalId) ?? null
    : null;
  const audienceSize = signal?.count ?? 0;

  // Cache the recommended value once per mount — Math.random would otherwise
  // jump on every render. Same convention as step-5-limit.tsx.
  const recommended = useMemo(
    () => recommendCampaignBudget(audienceSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [mode, setMode] = useState<Mode>("recommended");
  const [customValue, setCustomValue] = useState<string>(
    recommended > 0 ? String(recommended) : ""
  );
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const customParsed = parseFloat(customValue.replace(",", "."));
  const customIsValid = !isNaN(customParsed) && customParsed > 0;
  const activeBudget =
    mode === "recommended" ? recommended : customIsValid ? customParsed : 0;

  const touches = estimateTouches(activeBudget, audienceSize);
  const shortfall = computeShortfall(balance, activeBudget);
  const enoughBalance = shortfall <= 0;

  const [topUpOpen, setTopUpOpen] = useState(false);

  function handleBack() {
    if (!campaign) return;
    dispatch({
      type: "open_workflow",
      campaign: { id: campaign.id, name: campaign.name },
      launched: false,
    });
  }

  function handleLaunch() {
    if (!campaign) return;
    if (activeBudget <= 0) return;
    if (!enoughBalance) {
      setTopUpOpen(true);
      return;
    }
    dispatch({
      type: "campaign_launched",
      id: campaign.id,
      timestamp: new Date().toISOString(),
      budget: activeBudget,
    });
  }

  function handleTopUpSuccess(amount: number) {
    if (!campaign) return;
    dispatch({ type: "balance_topup", amount });
    dispatch({
      type: "campaign_launched",
      id: campaign.id,
      timestamp: new Date().toISOString(),
      budget: activeBudget,
    });
    setTopUpOpen(false);
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setCustomValue(raw);
  }

  function selectCustom() {
    setMode("custom");
    window.requestAnimationFrame(() => customInputRef.current?.focus());
  }

  // Fallback render (view mismatch or campaign vanished). Keeps hooks order
  // stable — early return must not skip any hook.
  if (view.kind !== "campaign-payment" || !campaign) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Кампания не найдена.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-promptbar pt-[120px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        {/* Header — back button + campaign name */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={handleBack}
            aria-label="Назад"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {campaign.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Оплата запуска кампании
            </p>
          </div>
        </div>

        {/* Budget cards — mirror of step-5-limit.tsx */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("recommended")}
            disabled={recommended <= 0}
            className={cn(
              "relative flex h-[140px] flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              mode === "recommended"
                ? "border-brand/60 bg-brand-muted"
                : "border-border bg-card hover:bg-accent/50",
              recommended <= 0 && "cursor-not-allowed opacity-50"
            )}
          >
            <RadioDot active={mode === "recommended"} />
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-widest",
                mode === "recommended"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Рекомендуемая
            </span>
            <span
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                mode === "recommended"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {recommended > 0 ? formatRub(recommended) : "—"}
            </span>
            <span className="mt-auto text-xs text-muted-foreground">
              На основе размера аудитории
            </span>
          </button>

          <button
            type="button"
            onClick={selectCustom}
            className={cn(
              "relative flex h-[140px] flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              mode === "custom"
                ? "border-brand/60 bg-brand-muted"
                : "border-border bg-card hover:bg-accent/50"
            )}
          >
            <RadioDot active={mode === "custom"} />
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-widest",
                mode === "custom"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Своя сумма
            </span>
            <div
              className="relative mt-1 w-full"
              onClick={(e) => {
                if (mode === "custom") e.stopPropagation();
              }}
            >
              <Input
                ref={customInputRef}
                type="text"
                inputMode="decimal"
                placeholder="Например, 500"
                value={customValue}
                onChange={handleCustomChange}
                disabled={mode !== "custom"}
                className={cn(
                  "pr-8 text-lg tabular-nums",
                  mode !== "custom" && "cursor-pointer"
                )}
                aria-label="Своя сумма"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                ₽
              </span>
            </div>
            <span className="mt-auto text-xs text-muted-foreground">
              Введите свою сумму
            </span>
          </button>
        </div>

        {/* Touches forecast */}
        <p className="text-sm text-muted-foreground">
          Прогноз касаний:{" "}
          <span className="font-medium text-foreground">
            {touches > 0 ? formatNumber(touches) : "—"}
          </span>
        </p>

        {/* Cost / Balance — mirror of step-6-summary.tsx */}
        <div
          className={cn(
            "rounded-lg border bg-card px-4 py-3.5",
            enoughBalance
              ? "border-border"
              : "border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5"
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Стоимость</span>
            <span className="font-semibold tabular-nums">
              {formatRub(activeBudget)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Баланс</span>
            <span className="font-medium tabular-nums">{formatRub(balance)}</span>
          </div>
          {!enoughBalance && (
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-foreground">Не хватает</span>
              <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {formatRub(shortfall)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-start">
          <Button
            onClick={handleLaunch}
            disabled={activeBudget <= 0}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {enoughBalance ? "Запустить" : "Пополнить и запустить"}
          </Button>
        </div>
      </div>

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        balance={balance}
        cost={activeBudget}
        entityLabel={campaign.name}
        onPaymentSuccess={handleTopUpSuccess}
      />
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute right-3 top-3 h-3 w-3 rounded-full border-2 transition-colors",
        active
          ? "border-foreground bg-foreground"
          : "border-border bg-transparent"
      )}
    />
  );
}
```

- [ ] **Step 2: Tests + lint**

```bash
npm test
npm run lint
```

Expected: всё зелёное. Сам компонент пока не рендерится (view kind ниоткуда не приходит) — только TypeScript-проверка плюс импорты `useAppState`, `useAppDispatch`, `TopUpModal`, `computeShortfall` должны быть валидны.

- [ ] **Step 3: Коммит**

```bash
git add src/sections/campaigns/campaign-payment-screen.tsx
git commit -m "feat(campaigns): add CampaignPaymentScreen view component"
```

---

# ФАЗА 4 — Wiring (handleLaunch + page routing)

## Task 6: Переключить `handleLaunch` в `workflow-section.tsx` на dispatch `open_campaign_payment`

**Files:**
- Modify: `src/sections/campaigns/workflow-section.tsx`

Spec §3.4 — `handleLaunch` теперь диспатчит `open_campaign_payment`. Платёжная логика (shortfall, TopUpModal) переезжает в `CampaignPaymentScreen`. Удаляем мёртвый код.

- [ ] **Step 1: Удалить импорты `TopUpModal` и `computeShortfall`**

В `src/sections/campaigns/workflow-section.tsx` найти (около строки 11):

```ts
import { TopUpModal, computeShortfall } from "@/sections/signals/top-up-modal";
```

Удалить целиком эту строку.

- [ ] **Step 2: Удалить `CAMPAIGN_LAUNCH_COST`, `topUpOpen`, `setTopUpOpen`**

В `src/sections/campaigns/workflow-section.tsx` найти (около строки 51):

```ts
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Flat prototype cost for launching a campaign — keeps the create-entity →
  // balance-check → top-up → launch mechanic identical between signals and
  // campaigns, per spec.
  const CAMPAIGN_LAUNCH_COST = 500;
```

Удалить целиком эти 6 строк (комментарий + объявление константы + useState).

- [ ] **Step 3: Также удалить `balance` из деструктуризации `useAppState()`**

В `src/sections/campaigns/workflow-section.tsx` найти (около строки 32):

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
    aiReply,
    signals,
    campaigns,
  } = useAppState();
```

(убрать строку `balance,` — она больше не используется в этом файле).

- [ ] **Step 4: Заменить тело `handleLaunch`**

Найти (около строки 163):

```ts
  function handleLaunch() {
    if (!currentCampaign) return;
    const graph = graphRef.current;
    if (!graph) {
      showToast({ kind: "error", text: "Граф ещё не готов, попробуйте снова." });
      return;
    }
    const result = validateWorkflow(graph, Boolean(currentSignal));
    if (!result.ok) {
      showToast({
        kind: "error",
        text: ERROR_TEXT[result.errors[0]] ?? "Не готово к запуску.",
      });
      return;
    }
    // Reuse signal-flow mechanic: balance check → top-up modal → launch.
    if (computeShortfall(balance, CAMPAIGN_LAUNCH_COST) > 0) {
      setTopUpOpen(true);
      return;
    }
    dispatch({
      type: "campaign_launched",
      id: currentCampaign.id,
      timestamp: new Date().toISOString(),
      budget: 0, // TODO: replaced when handleLaunch routes to payment screen
    });
  }
```

Заменить на:

```ts
  function handleLaunch() {
    if (!currentCampaign) return;
    const graph = graphRef.current;
    if (!graph) {
      showToast({ kind: "error", text: "Граф ещё не готов, попробуйте снова." });
      return;
    }
    const result = validateWorkflow(graph, Boolean(currentSignal));
    if (!result.ok) {
      showToast({
        kind: "error",
        text: ERROR_TEXT[result.errors[0]] ?? "Не готово к запуску.",
      });
      return;
    }
    // Validation passed — payment (budget + balance) now happens on the
    // dedicated CampaignPaymentScreen. canvas-header "Запустить" becomes a
    // routing hop, not a launch.
    dispatch({
      type: "open_campaign_payment",
      campaignId: currentCampaign.id,
    });
  }
```

- [ ] **Step 5: Удалить `handleCampaignTopUpSuccess`**

Найти (около строки 190):

```ts
  function handleCampaignTopUpSuccess(amount: number) {
    if (!currentCampaign) return;
    dispatch({ type: "balance_topup", amount });
    dispatch({
      type: "campaign_launched",
      id: currentCampaign.id,
      timestamp: new Date().toISOString(),
      budget: 0, // TODO: replaced when handleLaunch routes to payment screen
    });
    setTopUpOpen(false);
  }
```

Удалить целиком (8 строк + пустая строка после).

- [ ] **Step 6: Удалить `<TopUpModal>` из JSX**

Найти в JSX (около строки 302):

```tsx
      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        balance={balance}
        cost={CAMPAIGN_LAUNCH_COST}
        entityLabel={currentCampaign ? currentCampaign.name : undefined}
        onPaymentSuccess={handleCampaignTopUpSuccess}
      />
```

Удалить целиком (8 строк + ведущую пустую строку, если она нужна для аккуратности).

- [ ] **Step 7: Tests + lint**

```bash
npm test
npm run lint
```

Expected: всё зелёное. Если линтер ругается на unused imports — внимательно проверить, что `TopUpModal`/`computeShortfall` действительно удалены из импортов.

- [ ] **Step 8: Коммит**

```bash
git add src/sections/campaigns/workflow-section.tsx
git commit -m "feat(campaigns): route Запустить in canvas-header to payment screen"
```

---

## Task 7: Подключить `<CampaignPaymentScreen />` в `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Импортировать компонент**

В `src/app/page.tsx` рядом с другими импортами секций кампаний (около строки 24):

```ts
import { WorkflowSection } from "@/sections/campaigns/workflow-section";
import { CampaignScreen } from "@/sections/campaigns/campaign-screen";
```

Добавить после `WorkflowSection`-импорта:

```ts
import { CampaignPaymentScreen } from "@/sections/campaigns/campaign-payment-screen";
```

Финальный фрагмент:

```ts
import { WorkflowSection } from "@/sections/campaigns/workflow-section";
import { CampaignPaymentScreen } from "@/sections/campaigns/campaign-payment-screen";
import { CampaignScreen } from "@/sections/campaigns/campaign-screen";
```

- [ ] **Step 2: Добавить ветку в `renderMain`**

В `src/app/page.tsx` найти (около строки 74):

```ts
    if (view.kind === "workflow") return <WorkflowSection />;
    if (view.kind === "campaign") return <CampaignScreen />;
```

Заменить на:

```ts
    if (view.kind === "workflow") return <WorkflowSection />;
    if (view.kind === "campaign-payment") return <CampaignPaymentScreen />;
    if (view.kind === "campaign") return <CampaignScreen />;
```

- [ ] **Step 3: Tests + lint**

```bash
npm test
npm run lint
```

Expected: всё зелёное.

- [ ] **Step 4: Коммит**

```bash
git add src/app/page.tsx
git commit -m "feat(app): render CampaignPaymentScreen for view kind campaign-payment"
```

---

# ФАЗА 5 — Ручная верификация и финал

## Task 8: Manual smoke test — happy path и edge cases

**Files:** none

- [ ] **Step 1: Запустить дев-сервер на порту 3001**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/payment-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: `200`. Если порт занят — освободить через `lsof -ti:3001 | xargs kill -9`. Если запускается на 3000 (главный чек-аут), не глушить — пересборка на 3001.

- [ ] **Step 2: Полная матрица smoke-сценариев в браузере**

Открыть `http://localhost:3001`. Через DevPanel применить пресет с draft-кампанией (`mid` или `full`). Шаги:

| # | Действие | Ожидание |
|---|---|---|
| 1 | Открыть draft-кампанию из списка → попасть в workflow editor с `CanvasHeader` | Видна кнопка «Запустить» в canvas-header |
| 2 | Нажать «Запустить» в `CanvasHeader` | Переход на CampaignPaymentScreen без анимации; в шапке — название кампании; слева — крупная стрелка «Назад» (`size-9` icon-lg ghost) |
| 3 | На экране оплаты карточка «Рекомендуемая» активна по умолчанию | Жёлтая (brand) рамка; значение в ₽ ≥ 50; вторая карточка «Своя сумма» в неактивном виде |
| 4 | Под карточками строка «Прогноз касаний: N» | N = floor(activeBudget / 5), но не больше size аудитории |
| 5 | Кликнуть «Своя сумма» → ввести `1000` | Карточка активна; прогноз обновился; «Стоимость» в блоке внизу = 1000 ₽ |
| 6 | Ввести `0` или пустую строку | Кнопка «Запустить» disabled; прогноз = `—` |
| 7 | Сценарий А — баланс достаточный (через DevPanel выставить 1 000 000 ₽), вернуть «Рекомендуемая» | Блок «Стоимость / Баланс» с border-border (без амбер-подсветки); внизу кнопка «Запустить» |
| 8 | Нажать «Запустить» | Кампания запущена; переход на `CampaignScreen` (read-only campaign view) с правильным `launchedAt` |
| 9 | Сценарий B — баланс 0 (через DevPanel сбросить или взять `empty` пресет с новой draft-кампанией), открыть оплату снова | Видно «Не хватает» строкой с амбер-цветом; внизу кнопка «Пополнить и запустить» |
| 10 | Нажать «Пополнить и запустить» | Открылся `TopUpModal` с `cost` = activeBudget и `entityLabel` = `campaign.name` |
| 11 | В `TopUpModal` ввести сумму ≥ shortfall и нажать «Оплатить» | После 1.2s mock-задержки: баланс пополнился, кампания запустилась, переход на `CampaignScreen` |
| 12 | Из `CampaignPaymentScreen` нажать «Назад» | Возврат на workflow editor (`open_workflow launched=false`); сам экран не сохраняет выбранный budget — это намеренно (см. Risks) |
| 13 | Edge: на экране оплаты обновить страницу (F5) | `ViewAddress` восстанавливается → попадаем обратно на оплату той же кампании |
| 14 | Edge: применить другой пресет, находясь на экране оплаты (через DevPanel) | Если кампания пропала — fallback на «Кампании» секцию (см. `rebuildViewFromAddress`) |
| 15 | Edge: создать кампанию из flyout signal без активного signal (если возможно) → `signal=null` | `audienceSize=0`, recommended ≥ 50 ₽, прогноз = «—»; запуск возможен, если есть баланс |

Если хоть один сценарий ведёт себя не так — остановиться, починить, прежде чем переходить к Task 9.

- [ ] **Step 3: Дополнительно — проверить визуальную идентичность со step-6**

Открыть в браузере, бок-о-бок:
1. Мастер сигналов → дойти до step-6 (или подсмотреть скриншот из spec).
2. CampaignPaymentScreen.

**Должно совпадать:** блок «Стоимость / Баланс / Не хватает» по padding/border/colors; кнопка «Запустить» / «Пополнить и запустить» по стилю `bg-brand text-brand-foreground`. Карточки бюджета по форме и активному состоянию (brand border + brand-muted bg).

**Можно отличаться:** заголовок (на оплате — название кампании + «Оплата запуска кампании»; на step-6 — «Проверьте настройки сигнала»); summary-строки сценария/интересов/триггеров — их нет на оплате кампании.

- [ ] **Step 4: Если правки нужны — починить и закоммитить**

Если visual regression — внести правки в `campaign-payment-screen.tsx`:

```bash
git add src/sections/campaigns/campaign-payment-screen.tsx
git commit -m "fix(campaigns): <конкретное описание правки>"
```

---

## Task 9: Финальная верификация и сдача

**Files:** none

- [ ] **Step 1: Полный прогон тестов и линта**

```bash
npm test
npm run lint
```

Expected: оба полностью зелёные.

- [ ] **Step 2: Грэп-проверка — не осталось ли мёртвого кода**

```bash
grep -rn "CAMPAIGN_LAUNCH_COST" src/
grep -rn "handleCampaignTopUpSuccess" src/
grep -rn "topUpOpen" src/sections/campaigns/
```

Expected:
- `CAMPAIGN_LAUNCH_COST` — 0 совпадений.
- `handleCampaignTopUpSuccess` — 0 совпадений.
- `topUpOpen` — может появиться только в `campaign-payment-screen.tsx` (новый useState внутри платёжного экрана) — это нормально. В `workflow-section.tsx` должно быть 0.

- [ ] **Step 3: Грэп-проверка — все дисптачи `campaign_launched` передают `budget`**

```bash
grep -A3 '"campaign_launched"' src/
```

Expected: каждый `type: "campaign_launched"` в коде (`src/`) — внутри объекта, где есть поле `budget: ...`. Тестовые файлы тоже.

- [ ] **Step 4: Build sanity**

```bash
npm run build
```

Expected: build проходит до конца без TypeScript-ошибок.

- [ ] **Step 5: Финальный коммит (если были правки)**

Если в шагах 1-4 что-то правилось — закоммитить:

```bash
git add -A
git commit -m "chore(campaigns): cleanup after payment screen migration"
```

- [ ] **Step 6: Отчитаться о готовности**

Сообщить пользователю:
- Ветка: `feature/campaign-payment-screen`
- Worktree: `.worktrees/campaign-payment-screen`
- Количество коммитов на ветке: `git log --oneline main..HEAD | wc -l` (ожидаемо 7–9).
- Что осталось — мерж/PR (это решение пользователя, агент не мержит сам и не удаляет worktree).

---

## Открытые вопросы / Риски (из spec §8)

Эти моменты не блокируют реализацию, но при ревью/тестировании на них стоит обратить внимание:

1. **`recommendCampaignBudget` использует `Math.random()`.** Каждый mount компонента даёт новое recommended-значение; `useMemo([])` фиксирует на сессию — если юзер ушёл на «Назад» и вернулся «Запустить» снова, recommended может пересчитаться. Это прототип, принимаем.
2. **`COST_PER_TOUCH = 5 ₽` — захардкожено.** Не зависит от сегмента/географии — позже можно ввести lookup.
3. **Дублирование budget-cards.** Сознательное (spec §7, §8) — не выносим в общий компонент.
4. **Refresh на view=campaign-payment.** Покрыто в Task 2 (round-trip `ViewAddress`).
5. **`signal.type === scenario.name`** — verified в spec §3.8. Если в smoke-тестировании это окажется не так — это другой блок (spec §3.8, последний абзац), не правится здесь.
