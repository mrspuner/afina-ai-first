# AI-оркестратор Афины: архитектура

**Статус:** Реализован (план 004)
**Дата:** 2026-06-11
**Наследник:** `docs/ai-workflow-integration-spike.md` (спайк 002 — AI-парсер структурных команд воркфлоу)

---

## 1. Схема потока

```
PromptBar / ChatDrawer
    │
    ▼
use-chat-submit.ts (финальный фоллбек)
    │   Клиент собирает:
    │     { text, history ≤ 8 (без pending), context { screen, dataSummary } }
    │
    ▼
POST /api/ai/assist
    │
    ▼
4-слойный системный промпт (buildSystemPrompt — orchestrator-prompt.ts):
    1. Роль и голос (ROLE_AND_VOICE): уверенный, точный, ненавязчивый
    2. База знаний Афины (AFINA_KNOWLEDGE — afina-knowledge.ts): ~3–4K токенов
    3. Контекст момента: screen + dataSummary из data-summary.ts
    4. (Инструменты регистрируются отдельно через Vercel AI SDK tool())
    │
    ▼
Gemini 2.5 Flash (google() из @ai-sdk/google, toolChoice: "required")
    │   Function calling — одна из зарегистрированных функций за ход
    │
    ▼
AssistResult: { kind: "answer" | "clarify" | "none" }
    │
    ▼
Клиент: use-chat-submit.ts диспатчит в chat.updatePending(id, text)
    │   answer → показать ответ напрямую
    │   clarify → вопросы через join(" ")
    │   null / none → офлайн-каталог (lookupInformationalReply) + warmFallbackReply
```

**Контекст `screen`** собирается из `view.kind`:
- `section:Кампании`, `section:Сигналы`, `section:Статистика`, `section:Настройки`
- `workflow`, `guided-signal`, `welcome`, `survey`, …

**`dataSummary`** — компактный плоский текст, строится функцией `buildDataSummary({ campaigns, signals })` из `src/lib/ai/data-summary.ts`. Содержит: число кампаний, имена/статусы/бюджеты (до 20), число сигналов, типы/объёмы/сегменты (до 20). Параметры нод и аудитория не уходят.

---

## 2. Таблица инструментов

| Инструмент | Kind | Описание | Статус |
|------------|------|----------|--------|
| `answer` | `"answer"` | Ответить текстом (1–3 предложения в голосе продукта) | Реализован (план 004) |
| `clarify` | `"clarify"` | Задать 1–2 уточняющих вопроса (один раунд) | Реализован (план 004) |
| `edit_workflow` | `"workflow-ops"` | Редактировать граф воркфлоу через NL-команду | Реализован (план 005) |
| `rebuild_workflow` | `"rebuild"` | Пересобрать граф полностью по описанию | Реализован (план 005) |
| `edit_node_params` | `"node-params"` | Изменить параметры конкретной ноды | Реализован (план 005) |
| `undo_last` | `"undo"` | Откатить последнюю AI-правку графа | Реализован (план 005) |
| `configure_stats` | _(план 006)_ | Применить фильтры/группировку в разделе Статистика | Плейсхолдер |
| `navigate` | _(план 006)_ | Перейти в раздел/экран | Плейсхолдер |
| `edit_triggers` | _(план 006)_ | Добавить/исключить домены в триггере | Плейсхолдер |

Инструменты фильтруются по `context.screen` (и `selectedNode`, `undoAvailable`) — на экране воркфлоу подключаются граф-инструменты (`edit_workflow`, `rebuild_workflow`, `edit_node_params`, `undo_last`), на секции статистики — `configure_stats`, и т.д.

### Аргументы граф-инструментов

**`edit_workflow`** — принимает плоский массив `ops` (тип `StructuralOp[]` из `ops-wire-schema.ts`). Схема намеренно **не discriminated-union** — плоская форма `{ kind, ...payload }` позволяет Gemini генерировать корректный JSON без подсказки о разрешённых discriminant-значениях. Discriminated union в одном Zod-объекте требует от модели знания всех вариантов kind заранее, что приводило к генерации `{}` при незнакомых операциях (баг, выявленный live-вызовом серии 005, зафиксирован в `docs/plans/005-ai-workflow-tools.md §17`).

**`rebuild_workflow`** — принимает `{ nodes, edges, assumptions }` (тип `RebuildGraphSpec` из `rebuild-schema.ts`). После получения клиент прогоняет граф через `validateAiGraph()` из `ai-graph-validation.ts`: если валидация не прошла — ошибка отображается в чате без применения. Условие регистрации: `screen === "workflow"`.

**`edit_node_params`** — принимает `{ nodeId, patch, confirmation }`. `patch` — `Record<string, unknown>` (сервер не может строго типизировать union по kind ноды); редьюсер мерджит patch поверх существующих params, невалидные ключи безвредны. Условие регистрации: `screen === "workflow" && selectedNode != null`.

**`undo_last`** — принимает пустой объект `{}`. Условие регистрации: `screen === "workflow" && undoAvailable === true`.

---

## 2a. Откат (undo)

Механика отката — глубина 1, хранение в памяти компонента:

1. **Снапшот** — перед применением каждой структурной AI-операции (`structuralOps`) или rebuild в `workflow-view.tsx` внутри `apply(prev)` колбэка `runCycle` записывается `aiSnapshotRef.current = prev`. Флаг `workflow_ai_undo_availability: true` ставится сразу же — гарантируя, что снапшот уже записан в момент активации флага.
2. **Подсказка** — когда `state.aiUndoAvailable === true` и workflow не запущен (`!v.launched`), `selectPromptSuggestions` добавляет item `{ id: "ai-undo", label: "↩ Откатить" }` первым в список подсказок воркфлоу.
3. **Применение** — клик по подсказке или `result.kind === "undo"` от оркестратора диспатчит `workflow_ai_undo_request`; undo-эффект в `workflow-view.tsx` восстанавливает `aiSnapshotRef.current` и очищает флаг.
4. **Сброс при анмаунте** — cleanup-эффект в `workflow-view.tsx` диспатчит `workflow_ai_undo_availability: false` при размонтировании компонента (например, при запуске кампании).
5. **Страховка** — если `workflow_ai_undo_request` пришёл при `null`-снапшоте (edge case: размонтирование между событиями), флаг принудительно сбрасывается перед `return`.

---

## 3. Контракт

**Файл:** `src/lib/ai/assist-contract.ts`

Принцип: **AI заменяет парсеры, не аппликаторы.** LLM возвращает те же типизированные структуры, которые сегодня выдаёт regex/каталог. Существующие аппликаторы (chat.updatePending, dispatch-пайплайн, анимации воркфлоу) не меняются.

Ключевые типы:
- `AssistRequest` — `{ text, history: HistoryMessage[], context: AssistContext }`
- `AssistContext` — `{ screen: string, dataSummary: string }`
- `AssistResult` — discriminated union: `{ kind: "answer", text }` | `{ kind: "clarify", questions[] }` | `{ kind: "none" }`

Zod-схемы (`assistRequestSchema`, `assistResultSchema`) используются для валидации как на клиенте (`fetchAssist` — `assistResultSchema.safeParse`), так и на сервере.

---

## 4. Fallback-цепочка

```
Пользователь отправил свободный вопрос в чат
    │
    ▼
isAiParserEnabled()? — нет (localStorage "off") ──→ офлайн-путь (синхронный)
    │
   да
    │
    ▼
assistAvailable? — нет (ключ не прошёл пробу) ──→ офлайн-путь (синхронный)
    │
   да
    │
    ▼
fetchAssist({ text, history, context }) — AbortSignal.timeout(6000)
    │
    ├── таймаут (6с) ──────────────────→ null → офлайн-путь
    ├── HTTP 503 (нет ключа) ──────────→ null → офлайн-путь
    ├── HTTP 429 / 502 (rate limit) ───→ null → офлайн-путь
    ├── невалидный JSON / схема ───────→ null → офлайн-путь
    ├── kind: "none" ──────────────────→ офлайн-путь
    │
    ├── kind: "answer" ────────────────→ chat.updatePending(id, result.text)
    └── kind: "clarify" ───────────────→ chat.updatePending(id, questions.join(" "))

Офлайн-путь:
    lookupInformationalReply(text) ?? warmFallbackReply()
    (каталог ~40 записей + тёплая заглушка — бит-в-бит как до плана 004)
```

**Важно:** путь «нет ключа» (`!assistAvailable || !isAiParserEnabled()`) — **синхронный**, без единого `await`. Поведение бит-в-бит как до интеграции.

**Privacy-граница:** на сервер уходят текст вопроса, история сессии (≤8 сообщений), сводка моковых данных кампаний/сигналов. Тексты запросов и ответов модели **не логируются** (только тип ошибки при сбое — `"rate-limited"` или `"ai-failed"`). Полный стейт, параметры нод, данные аудитории, ключи — не уходят никогда.

---

## 5. Как добавить новый инструмент

1. **Zod-схема аргументов** — описать `inputSchema: z.object({ ... })` прямо в определении `tool()` в `src/app/api/ai/assist/route.ts`.
2. **`tool()` в route.ts** — зарегистрировать инструмент в объекте `tools`, `execute` пишет в `result`.
3. **Kind в `assistResultSchema`** — добавить вариант в discriminated union в `src/lib/ai/assist-contract.ts` (и соответствующий тип).
4. **Ветка исполнения на клиенте** — добавить `else if (result?.kind === "новый_инструмент")` в `use-chat-submit.ts` (финальный фоллбек) или в соответствующий обработчик.
5. **Кейсы в evals** — добавить тесты в план 007 (экзамен оркестратора): ожидаемый kind + ключевые слова в тексте ответа.

---

## 6. Файловая карта

| Файл | Роль |
|------|------|
| `src/app/api/ai/assist/route.ts` | Route handler: GET (проба ключа), POST (LLM-вызов, инструменты) |
| `src/lib/ai/assist-contract.ts` | Zod-схемы + TypeScript-типы запроса/ответа |
| `src/lib/ai/assist-client.ts` | `fetchAssistAvailability()`, `fetchAssist()` — клиентский слой |
| `src/lib/ai/orchestrator-prompt.ts` | `buildSystemPrompt()`, `buildMessages()` — системный промпт |
| `src/lib/ai/afina-knowledge.ts` | `AFINA_KNOWLEDGE` — база знаний о продукте (~3–4K токенов) |
| `src/lib/ai/data-summary.ts` | `buildDataSummary()` — сводка стейта для промпта |
| `src/sections/shell/use-chat-submit.ts` | Точка интеграции: финальный фоллбек → оркестратор |
| `src/sections/shell/prompt-composer.tsx` | Воркфлоу-ветка: граф-инструменты через оркестратор (план 005) |
| `src/lib/ai/graph-summary.ts` | `summarizeGraph()` — компактная сводка нод/рёбер для контекста |
| `src/lib/ai/rebuild-schema.ts` | `rebuildGraphSchema`, `buildGraphFromSpec()` — спека и билдер пересборки |
| `src/state/ai-graph-validation.ts` | `validateAiGraph()` — валидация графа перед применением rebuild |
| `src/sections/campaigns/workflow-graph-cache.ts` | `getCachedGraph()` / `setCachedGraph()` — персистентный кэш текущего графа |
| `src/state/suggestion-registry/views.ts` | `resolveWorkflowScenario(aiUndoAvailable)` — подсказка «↩ Откатить» |
