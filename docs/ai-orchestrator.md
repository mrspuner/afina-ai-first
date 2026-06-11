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
| `edit_workflow` | _(план 005)_ | Редактировать граф воркфлоу через NL-команду | Плейсхолдер |
| `rebuild_workflow` | _(план 005)_ | Пересобрать граф полностью по описанию | Плейсхолдер |
| `edit_node_params` | _(план 005)_ | Изменить параметры конкретной ноды | Плейсхолдер |
| `undo_last` | _(план 005)_ | Откатить последнюю операцию | Плейсхолдер |
| `configure_stats` | _(план 006)_ | Применить фильтры/группировку в разделе Статистика | Плейсхолдер |
| `navigate` | _(план 006)_ | Перейти в раздел/экран | Плейсхолдер |
| `edit_triggers` | _(план 006)_ | Добавить/исключить домены в триггере | Плейсхолдер |

Инструменты фильтруются по `context.screen` — на экране воркфлоу подключаются граф-инструменты, на секции статистики — `configure_stats`, и т.д. (будет введено в планах 005/006).

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
