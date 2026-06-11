# Plan 006: Инструменты configure_stats, navigate, edit_triggers + составные просьбы

> **Executor instructions**: Follow this plan step by step, verify every
> step, STOP conditions обязательны. По завершении обновить строку статуса
> в `plans/README.md`.
>
> **REQUIRED SUB-SKILL**: superpowers:executing-plans (или
> superpowers:subagent-driven-development).
>
> **Drift check (run first)**:
> `git diff --stat c2513c6..HEAD -- src/sections/shell/use-chat-submit.ts src/lib/stats-query-matcher.ts src/sections/statistics/statistics-state.ts src/state/app-state.ts src/lib/trigger-edit-parser.ts src/sections/signals/steps/step-2-interests.tsx`
> Планы 004–005 трогали use-chat-submit (фоллбек-бранч) и app-state
> (insertion point) — это ожидаемо; сверить остальное с "Current state".

## Status

- **Priority**: P1
- **Effort**: M–L
- **Risk**: MED (первые инструменты, меняющие НЕ-воркфлоу стейт; смягчается
  тем, что все аппликаторы — существующие dispatch-действия)
- **Depends on**: plans/005-ai-workflow-tools.md (паттерн условной
  регистрации инструментов, расширенный контракт)
- **Spec**: спека §4 (configure_stats, navigate, edit_triggers, составные
  просьбы), §16 (карта визарда в контексте)
- **Planned at**: commit `c2513c6`, 2026-06-11

## Why this matters

Закрывает «отобразить и настроить»: свободная фраза перенастраивает живую
таблицу статистики (сегодня — 10 жёстких запросов), «покажи кампании» ведёт
по интерфейсу, правки доменов триггеров понимают любые формулировки
(сегодня — только «добавь d1.ru» / «исключи d2.ru»). Плюс составные просьбы:
«открой статистику и покажи по каналам» — два инструмента за один запрос.

## Current state

- Статистика: `StatisticsFilters` (`statistics-state.ts:84-94`) — поля
  `rows: RowKind` (15 значений: days/weekdays/weeks/months/offers/
  subscribers/channels/creatives/triggers/landings/campaigns/scenarios/
  strategies/advertisers/traffic-suppliers), `rowCount: number`,
  `subRows: RowKind | "none"`, `sort: { column: ColumnKey | "label";
  direction: "asc" | "desc" } | null`, `period: { preset: PeriodPreset;
  from?; to? }` (preset: today/yesterday/this-quarter/last-quarter/
  this-month/last-month/this-year/last-year/custom), `columns: ColumnKey[]`
  (approves/expenses/income/holds/rejects/clicks/sends/actions/ar/rr).
  Действие `stats_apply_patch { patch: Partial<StatisticsFilters> }`,
  редьюсер — shallow merge (`app-state.ts:982`).
- Канированный путь: `matchStatsQuery` (10 запросов) → `runStatsQuery`
  (`use-chat-submit.ts:105-202`) — каждый кейс = `respond(reply, () =>
  appDispatch(...))`. Работает ТОЛЬКО на разделе «Статистика»
  (`isOnStatisticsSection`, строки 266–272).
- Навигация: view union (`app-state.ts:105-115`), `SectionName =
  "Статистика" | "Сигналы" | "Кампании" | "Настройки"`. Действия:
  `sidebar_nav { section }`, `goto_stats { campaignId? }`, `open_workflow
  { campaign: { id; name }; launched }`, `signal_opened { id }`,
  `go_welcome`. `open_campaign_payment` валидирует id по стейту, остальные
  редьюсеры без гардов.
- Триггеры: `parseTriggerCommand(raw)` → union edit/clear-added/
  clear-excluded/fallback (`trigger-edit-parser.ts:17-21`); применение —
  `triggerEdit.applyToTrigger(triggerId, parsed)` (TriggerEditApi из
  контекста, реализация в `step-2-interests.tsx:557-581` через
  `applyEditToDelta`); вызов из `use-chat-submit.ts:318-336` при активном
  trigger-чипе (payload = triggerId). `resolveTriggerIdByLabel` есть в
  trigger-edit-context (NOOP-версия возвращает null). Триггерный шаг
  визарда — шаг 2 «Интересы» (`STEPPER_ITEMS`,
  `campaign-stepper.tsx:6-15`); текущий шаг — `state.wizardCurrentStep:
  number | null` (публикуется `wizard_step_changed` из
  campaign-workspace).
- После 004–005: оркестратор с условной регистрацией tools по
  `context.screen`; `assistResultSchema` — discriminated union; клиентские
  ветки исполнения в use-chat-submit (answer/clarify) и prompt-composer
  (граф). Контекст: `screen, dataSummary, graph?, selectedNode?,
  undoAvailable?`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit | `npm test` | зелёные |
| E2E | `npm run test:e2e` | зелёные |
| Dev | `npm run dev -- -p 3001` | порт 3001 |

## Scope

**Create:**
- `src/lib/ai/stats-patch-schema.ts` + `.test.ts`
- `src/lib/ai/navigate-schema.ts` + `.test.ts`

**Modify:**
- `src/lib/ai/assist-contract.ts` — kind'ы stats/navigate/triggers,
  контекст: `wizardStep?`, `activeTrigger?`, `navigationTargets`
- `src/app/api/ai/assist/route.ts` — три инструмента + multi-tool результат
- `src/lib/ai/orchestrator-prompt.ts` — wizardStep/activeTrigger в промпт
- `src/sections/shell/use-chat-submit.ts` — исполнение результатов
  (включая последовательность), AI перед канированным stats-путём
- `src/lib/ai/data-summary.ts` — statsLines подключить (агрегат для ответов)
- `plans/README.md`

**Out of scope:**
- `stats-query-matcher.ts`, `runStatsQuery` — остаются офлайн-fallback
  бит-в-бит; не удалять
- `trigger-edit-parser.ts` — regex остаётся fast-path/fallback
- Правка графа с чужого экрана (спека §4: navigate + «скажите здесь»)
- `fill_wizard_field`, шаги визарда кроме триггеров

## Git workflow

Тот же ворктри `.worktrees/plans-001-003`, ветка `feat/plans-001-003`.

## Steps

### Step 1: Схема патча статистики

- [ ] Создать `src/lib/ai/stats-patch-schema.ts` — zod-зеркало подмножества
  `StatisticsFilters` (только то, чем управляет AI; calcMethod/currency/
  conditions/columns сознательно не отдаём — ими управляют ручные контролы):

```ts
import { z } from "zod";
import type { StatisticsFilters } from "@/sections/statistics/statistics-state";

export const rowKindSchema = z.enum([
  "days", "weekdays", "weeks", "months", "offers", "subscribers", "channels",
  "creatives", "triggers", "landings", "campaigns", "scenarios", "strategies",
  "advertisers", "traffic-suppliers",
]);

export const sortColumnSchema = z.enum([
  "approves", "expenses", "income", "holds", "rejects", "clicks", "sends",
  "actions", "ar", "rr", "label",
]);

export const periodSchema = z.object({
  preset: z.enum([
    "today", "yesterday", "this-quarter", "last-quarter", "this-month",
    "last-month", "this-year", "last-year", "custom",
  ]),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const statsPatchSchema = z.object({
  rows: rowKindSchema.optional(),
  subRows: z.union([rowKindSchema, z.literal("none")]).optional(),
  rowCount: z.number().int().min(1).max(100).optional(),
  sort: z
    .union([
      z.object({ column: sortColumnSchema, direction: z.enum(["asc", "desc"]) }),
      z.null(),
    ])
    .optional(),
  period: periodSchema.optional(),
});
export type StatsPatch = z.infer<typeof statsPatchSchema>;

// Совместимость на уровне типов: патч присваим в Partial<StatisticsFilters>.
const _check: Partial<StatisticsFilters> = {} as StatsPatch;
void _check;
```

- [ ] Тест `stats-patch-schema.test.ts`: валидный патч (rows campaigns +
  sort income desc + period custom июнь + rowCount 10 — кейс
  top-campaigns-income-june) проходит; `rows: "космос"` отклоняется;
  `rowCount: 0` отклоняется; пустой объект проходит (все поля optional —
  но см. инструмент: min 1 поле требует промпт, не схема).
- [ ] `npm test -- stats-patch-schema` зелёный; `npx tsc --noEmit` exit 0.
- [ ] Commit: `feat(ai): zod-схема патча таблицы статистики`

### Step 2: Схема навигации

- [ ] Создать `src/lib/ai/navigate-schema.ts`:

```ts
import { z } from "zod";

/**
 * Цели навигации — закрытое пространство. Кампании/сигналы модель
 * адресует по id из dataSummary (там id перечислены рядом с именами).
 */
export const navigateTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("section"),
    name: z.enum(["Статистика", "Сигналы", "Кампании", "Настройки"]),
  }),
  z.object({ kind: z.literal("campaign-workflow"), campaignId: z.string() }),
  z.object({ kind: z.literal("signal"), signalId: z.string() }),
]);
export type NavigateTarget = z.infer<typeof navigateTargetSchema>;
```

- [ ] Тест: section «Статистика» проходит; section «Лендинги» отклоняется;
  campaign-workflow без campaignId отклоняется.
- [ ] Commit: `feat(ai): zod-схема целей навигации`

### Step 3: Контракт — kind'ы и контекст; multi-tool

- [ ] В `assist-contract.ts`:
  - контекст добавить:

```ts
  wizardStep: z.object({ step: z.number(), title: z.string() }).optional(),
  activeTrigger: z.object({ id: z.string(), label: z.string() }).optional(),
```

  - в `assistResultSchema` добавить варианты:

```ts
  z.object({ kind: z.literal("stats"), patch: statsPatchSchema, confirmation: z.string() }),
  z.object({ kind: z.literal("navigate"), target: navigateTargetSchema, confirmation: z.string() }),
  z.object({
    kind: z.literal("triggers"),
    add: z.array(z.string()),
    exclude: z.array(z.string()),
    clearAdded: z.boolean().optional(),
    clearExcluded: z.boolean().optional(),
    confirmation: z.string(),
  }),
```

  - **multi-tool**: верхний уровень ответа эндпоинта становится

```ts
export const assistResponseSchema = z.object({
  results: z.array(assistResultSchema).min(1).max(2),
});
export type AssistResponse = z.infer<typeof assistResponseSchema>;
```

  Клиент (assist-client) переключить на `assistResponseSchema`;
  для обратной совместимости внутри 006 же обновить обе существующие ветки
  исполнения (use-chat-submit, prompt-composer) на `results[]` — см. шаг 6.
- [ ] Дополнить тесты контракта: ответ с `[navigate, stats]` проходит;
  с тремя результатами — отклоняется; `triggers` с пустыми add и exclude и
  без clear-флагов — ВАЛИДЕН по схеме (модель так не должна делать по
  промпту, но контракт не выражает этой инварианты — отметить комментарием).
- [ ] `npm test -- assist-contract` зелёный; `npx tsc --noEmit` exit 0.
- [ ] Commit: `feat(ai): контракт — stats/navigate/triggers, до двух результатов`

### Step 4: Route handler — инструменты и сбор последовательности

- [ ] В `route.ts` заменить `let result: AssistResult` на накопитель:

```ts
const results: AssistResult[] = [];
```

  все существующие `execute` переписать с `result = ...` на
  `results.push(...)` (answer/clarify/edit_workflow/rebuild_workflow/
  edit_node_params/undo_last — каждый пушит свой kind). Ответ:

```ts
if (results.length === 0) results.push({ kind: "none" });
return Response.json({ results: results.slice(0, 2) }, { status: 200 });
```

  Параллельные/последовательные вызовы инструментов моделью в одном ходе
  `ai@6` исполняет все — порядок пушей соответствует порядку вызовов.
- [ ] Зарегистрировать всюду-доступные инструменты (рядом с answer/clarify):

```ts
import { statsPatchSchema } from "@/lib/ai/stats-patch-schema";
import { navigateTargetSchema } from "@/lib/ai/navigate-schema";

configure_stats: tool({
  description:
    "Перенастроить таблицу статистики: группировка строк (rows), сортировка, " +
    "период, число строк. Используй для просьб «покажи/разбей/отсортируй/за <период>» " +
    "про статистику. Передавай только меняемые поля (минимум одно). " +
    "confirmation — короткая фраза, что сделал («Разбил по каналам за май»).",
  inputSchema: z.object({ patch: statsPatchSchema, confirmation: z.string() }),
  execute: ({ patch, confirmation }) => {
    results.push({ kind: "stats", patch, confirmation });
    return "ok";
  },
}),
navigate: tool({
  description:
    "Перейти к разделу, кампании или сигналу («покажи кампании», «открой статистику»). " +
    "Кампанию/сигнал адресуй по id из данных аккаунта. Если просят И открыть, И " +
    "настроить статистику — вызови navigate, затем configure_stats (в этом порядке). " +
    "Менять граф воркфлоу другой кампании нельзя: вызови navigate и скажи в answer, " +
    "что правку нужно повторить на открывшемся экране.",
  inputSchema: z.object({ target: navigateTargetSchema, confirmation: z.string() }),
  execute: ({ target, confirmation }) => {
    results.push({ kind: "navigate", target, confirmation });
    return "ok";
  },
}),
```

- [ ] Условно — триггеры (только на шаге триггеров визарда с активным
  триггером):

```ts
if (context.activeTrigger) {
  Object.assign(tools, {
    edit_triggers: tool({
      description:
        `Изменить домены триггера «${context.activeTrigger.label}»: add — добавить ` +
        "домены, exclude — исключить; clearAdded/clearExcluded — снять все ручные " +
        "добавления/исключения. Понимай любые формулировки («убери всё что я добавлял», " +
        "«не хочу сбербанк» → exclude sberbank.ru если домен есть в контексте).",
      inputSchema: z.object({
        add: z.array(z.string()),
        exclude: z.array(z.string()),
        clearAdded: z.boolean().optional(),
        clearExcluded: z.boolean().optional(),
        confirmation: z.string(),
      }),
      execute: (args) => {
        results.push({ kind: "triggers", ...args });
        return "ok";
      },
    }),
  });
}
```

- [ ] В `orchestrator-prompt.ts` добавить в контекстный блок:

```ts
    ...(context.wizardStep
      ? [`Пользователь в визарде сигнала, шаг ${context.wizardStep.step}: ${context.wizardStep.title}.`]
      : []),
    ...(context.activeTrigger
      ? [`Активный триггер для правок доменов: «${context.activeTrigger.label}».`]
      : []),
```

  и тест на присутствие в промпте.
- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные.
- [ ] Commit: `feat(ai): инструменты configure_stats, navigate, edit_triggers`

### Step 5: Сводка статистики в dataSummary

- [ ] В местах сборки `dataSummary` (use-chat-submit; prompt-composer)
  передавать `statsLines`: на клиенте построить агрегат через фактический
  пайплайн fact-cube (см. примечание в плане 004 шаг 3 — реальные имена
  функций уже выяснены при исполнении 004; переиспользовать) и
  `statsLinesFromFunnel(total)`. Если 004 зафиксировал STOP-оговорку про
  fact-cube — statsLines по-прежнему не передавать и отметить в отчёте.
- [ ] `npx tsc --noEmit` exit 0.
- [ ] Commit: `feat(ai): агрегаты статистики в сводке данных`

### Step 6: Исполнение результатов на клиенте

- [ ] В `use-chat-submit.ts` вынести исполнитель (внутри хука — ему нужны
  dispatch/chat/triggerEdit):

```ts
function executeAssistResults(
  results: AssistResult[],
  pendingId: string,
  originalText: string
) {
  const confirmations: string[] = [];
  for (const r of results) {
    switch (r.kind) {
      case "answer":
        confirmations.push(r.text);
        break;
      case "clarify":
        confirmations.push(r.questions.join(" "));
        break;
      case "stats":
        appDispatch({ type: "stats_apply_patch", patch: r.patch });
        confirmations.push(r.confirmation);
        break;
      case "navigate": {
        if (r.target.kind === "section") {
          appDispatch({ type: "sidebar_nav", section: r.target.name });
        } else if (r.target.kind === "campaign-workflow") {
          const c = campaigns.find((cc) => cc.id === r.target.campaignId);
          if (!c) break; // несуществующий id — молча пропустить нельзя:
          // подтверждение не пушим, в конце сработает фоллбек-ветка
          appDispatch({
            type: "open_workflow",
            campaign: { id: c.id, name: c.name },
            launched: c.status !== "draft",
          });
        } else {
          appDispatch({ type: "signal_opened", id: r.target.signalId });
        }
        confirmations.push(r.confirmation);
        break;
      }
      case "triggers": {
        const triggerId = activeTriggerId; // из контекста сабмита, см. ниже
        if (!triggerId) break;
        if (r.clearAdded) triggerEdit.applyToTrigger(triggerId, { kind: "clear-added" });
        if (r.clearExcluded) triggerEdit.applyToTrigger(triggerId, { kind: "clear-excluded" });
        if (r.add.length > 0 || r.exclude.length > 0) {
          triggerEdit.applyToTrigger(triggerId, { kind: "edit", add: r.add, exclude: r.exclude });
        }
        confirmations.push(r.confirmation);
        break;
      }
      case "none":
        break;
      // workflow-ops / rebuild / node-params / undo сюда не приходят:
      // на воркфлоу сабмит уходит через prompt-composer (план 005)
      default:
        break;
    }
  }
  if (confirmations.length > 0) {
    chat.updatePending(pendingId, confirmations.join(" "));
  } else {
    chat.updatePending(pendingId, lookupInformationalReply(originalText) ?? warmFallbackReply());
  }
}
```

- [ ] Подключить исполнитель в AI-ветке фоллбека (план 004, шаг 7):
  `fetchAssist(...).then((resp) => { if (resp) executeAssistResults(resp.results, id, text); else <прежний офлайн-путь>; })`
  Контекст обогатить: `wizardStep` — из `state.wizardCurrentStep` +
  `STEPPER_ITEMS` (импорт из campaign-stepper; title по step);
  `activeTrigger` — из активного trigger-сегмента (тот же
  `segments.find((s) => s.chip.kind === "trigger")`, payload = id, label =
  chip.label); `activeTriggerId` сохранить в замыкании сабмита для
  исполнителя.
- [ ] **Порядок веток сабмита**: AI-попытку для статистики ставим ПЕРЕД
  канированным `matchStatsQuery` (AI — основной путь, спека §2), но только
  при `useAi`; при `!useAi` канированный путь срабатывает как сегодня.
  Регex-путь триггеров (строки 318–336) оставить ПЕРЕД AI как fast-path:
  если `parseTriggerCommand` распознал — применяем мгновенно без сети
  (спека §2: regex = fast-path). НЕ распознал (fallback) и есть
  trigger-чип → AI-ветка с activeTrigger.
- [ ] В `prompt-composer.tsx` обновить ветку плана 005 на `resp.results`:
  итерация по тому же принципу (первый результат графовых kind'ов
  диспатчится, answer/clarify — в чат; stats/navigate тоже исполнять —
  модель может ответить navigate на «покажи статистику» с экрана
  воркфлоу). Вынести общий исполнитель в отдельный модуль НЕ нужно
  (разные доступные dispatch-наборы и чат-паттерны; дублирование switch —
  осознанная цена, отметить комментарием-ссылкой на план).
- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные; `npm run test:e2e`
  зелёные (без ключа: канированная статистика и regex-триггеры бит-в-бит).
- [ ] Commit: `feat(ai): исполнение результатов оркестратора — статистика, навигация, триггеры`

### Step 7: Живая проверка (при наличии ключа)

- [ ] Раздел «Статистика»: «покажи по каналам за май и отсортируй по
  расходу» → таблица перегруппировалась, период май, сортировка expenses
  desc, подтверждение в чате.
- [ ] Раздел «Сигналы»: «открой статистику и разбей по креативам» →
  переход + rows creatives (составная просьба, 2 результата).
- [ ] Визард, шаг 2, триггер-чип активен: «не хочу банки, добавь
  cian.ru» → exclude содержит банковские домены из контекста… НЕТ —
  домены триггера в контекст НЕ передаются в этом плане; модель исключит
  только названные доменами. Проверить фразой «исключи sberbank.ru и
  добавь cian.ru» → дельта применилась. (Передача списка доменов триггера
  в контекст — кандидат на следующую итерацию; зафиксировать в
  Maintenance notes отчёта.)
- [ ] «как настроить таблицу?» с любого экрана → answer без выдумок.
- [ ] Без ключа — пометить «live: not verified (no key)».

### Step 8: Доки и статус

- [ ] `docs/ai-orchestrator.md`: дополнить таблицу инструментов тремя
  новыми; раздел «Составные просьбы» (max 2 результата, порядок исполнения,
  ограничение кросс-экранной правки графа).
- [ ] Обновить строку 006 в `plans/README.md`.
- [ ] Финальный прогон: `npx tsc --noEmit`, `npm test`, `npm run test:e2e`.
- [ ] Commit: `docs(ai): инструменты статистики/навигации/триггеров + статус 006`

## Test plan

- Новые юнит: stats-patch-schema (4), navigate-schema (3), контракт
  (multi-tool, новые kind'ы), промпт (wizardStep/activeTrigger).
- Существующие: stats-query-matcher и trigger-edit-parser без правок —
  зелёные; e2e зелёные без ключа.
- Живая проверка шага 7.

## Done criteria

- [ ] `npx tsc --noEmit`, `npm test`, `npm run test:e2e` — exit 0
- [ ] Тип-проверка `_check: Partial<StatisticsFilters>` компилируется
- [ ] Без ключа: канированная статистика и regex-триггеры бит-в-бит
- [ ] Строка 006 в `plans/README.md` обновлена

## STOP conditions

- `ai@6` не исполняет несколько tool-вызовов за ход (или порядок
  недетерминирован) — сократить multi-tool до max 1 и доложить (составные
  просьбы уйдут в следующую итерацию).
- Исполнение `navigate` + `configure_stats` подряд ломает view-историю
  (browser back, e2e `view-history.spec.ts` красный) — доложить, не чинить
  историю самостоятельно.
- `triggerEdit.applyToTrigger` недоступен из use-chat-submit вне шага 2
  (NOOP-контекст) и это блокирует AI-ветку триггеров.
- Любой шаг подталкивает закоммитить ключ.

## Maintenance notes

- Домены триггера не передаются в контекст (токен-бюджет; «не хочу банки»
  без названий доменов модель не разрешит) — кандидат на следующую
  итерацию вместе с fill_wizard_field.
- calcMethod/currency/conditions/columns исключены из statsPatch осознанно;
  расширять по одному полю с кейсами в evals (план 007).
- Дублирование switch-исполнителя в use-chat-submit и prompt-composer —
  осознанное; если появится третья поверхность исполнения — выносить в
  общий модуль.
