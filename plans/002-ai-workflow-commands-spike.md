# Plan 002: Спайк — реальный AI парсит команды графа воркфлоу (вертикальный срез)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2d9f2c7..HEAD -- src/state/structural-commands.ts src/sections/shell/prompt-composer.tsx src/state/dev-config.ts src/types/workflow.ts package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L (спайк: дизайн-док + работающий вертикальный срез на один тип запроса)
- **Risk**: MED (первый серверный код в клиентском прототипе; смягчается фиче-флагом и regex-fallback)
- **Depends on**: plans/001-workflow-cycle-races.md (AI-задержки сделают гонки из 001 повседневными)
- **Category**: direction
- **Planned at**: commit `2d9f2c7`, 2026-06-11

## Why this matters

Продукт позиционируется как AI-first («магия под капотом» — PRODUCT.md), но весь «AI» — это regex: жёсткие глагольные паттерны и словари синонимов. Пользователь, сформулировавший команду чуть иначе («сначала пуш, и если не открыл — письмо через день»), получает «Команда не распознана». Базовая библиотека для реального AI (`ai@6`, Vercel AI SDK) лежит в package.json с нуля импортов. **Провайдер решён оператором (2026-06-11): Gemini Flash через `@ai-sdk/google`, бесплатный тариф Google AI Studio** — оператор в Грузии (страна в списке поддерживаемых), ключ выдаётся без карты, лимитов (~15 запросов/мин) прототипу хватает с запасом. Цель спайка: **один работающий вертикальный срез** — свободный текст → LLM → типизированные `StructuralOp[]` → граф перестраивается существующим механизмом — плюс дизайн-док, как расширить это на остальные типы запросов. Не «подключить AI везде».

Ключевая архитектурная идея (её и валидирует спайк): **AI заменяет парсеры, а не аппликаторы.** LLM возвращает те же типы (`StructuralOp[]`), которые сегодня выдаёт regex, — весь дальнейший пайплайн (dispatch → props → applyOps → анимация цикла) не меняется ни на строчку.

## Current state

- Приложение полностью клиентское: `src/app/` содержит только `layout.tsx`, `page.tsx` — **route handlers (app/api) ещё нет**, появятся впервые.
- AGENTS.md предупреждает: Next.js 16 имеет breaking changes — **перед написанием route handler прочитать** соответствующий гайд в `node_modules/next/dist/docs/`.
- Mock-слой AI:
  - `src/state/structural-commands.ts` — regex-парсер структурных команд. `parseStructuralCommands(input)` (строка 239), словари `TYPE_LOOKUP` (строка 33: «смс»→sms, «задержка»→wait, «витрина»→storefront…) и `REF_SYNONYMS` (строка 52). Применение — `applyOps(graph, ops)` (строка 741), чистая функция.
  - `src/lib/trigger-edit-parser.ts` — regex-парсер правок триггера; fallback-сообщение `"AI пока не подключён..."` (строка ~25). В этом спайке НЕ трогаем — но в дизайн-доке он второй кандидат на тот же контракт.
  - `src/lib/mock-ai-reply.ts`, `src/lib/informational-replies.ts`, `src/lib/stats-query-matcher.ts` — остальные mock-ответчики, в дизайн-док как будущие кандидаты.
- Типы команд (`src/state/structural-commands.ts:9-28`) — их зеркалит zod-схема:

```ts
export type Placement =
  | { mode: "after"; ref: string }
  | { mode: "before"; ref: string }
  | { mode: "between"; refA: string; refB: string }
  | { mode: "auto" };

export type StructuralOp =
  | { kind: "add"; nodeType: WorkflowNodeType; placement: Placement; inlineParams?: string }
  | { kind: "remove"; ref: string }
  | { kind: "replace"; ref: string; newType: WorkflowNodeType; inlineParams?: string };
```

`WorkflowNodeType` — в `src/types/workflow.ts` (sms / email / push / ivr / wait / storefront / landing / success / end / condition — сверить точный список по файлу).

- Точка интеграции — `src/sections/shell/prompt-composer.tsx:294-322` (free-text сабмит на экране воркфлоу):

```ts
const structural = parseStructuralCommands(rawText);
...
if (structural.ops.length > 0) {
  dispatch({ type: "workflow_structural_commands_submit", ops: structural.ops });
}
...
if (structural.ops.length === 0 && nodeCommands.length === 0 && rawText.trim()) {
  dispatch({ type: "workflow_command_submit", text: rawText }); // легаси-путь → «Команда не распознана»
}
```

  Важно: текущий сабмит **синхронный**, AI-вызов — асинхронный. План решает это через async-ветку с тем же диспатчем по завершении.
- Паттерн dev-флагов — `src/state/dev-config.ts`: localStorage-ключи вида `afina.dev.*`, SSR-safe геттеры с дефолтом. Флаг AI делать по этому образцу.
- `zod` и `@ai-sdk/google` в зависимостях НЕТ — добавить оба (`zod` использует `generateObject` из `ai`; `@ai-sdk/google` — адаптер провайдера Gemini). Лежащий в package.json `@ai-sdk/openai` НЕ использовать — он не нужен (его удаление учтено в отложенной чистке зависимостей, см. plans/README.md).
- Секретов в репо нет; `.env*` файлов нет. **Ключ API никогда не коммитить** — только имя переменной в `.env.example`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Add deps | `npm install zod @ai-sdk/google` | exit 0; package.json + lock обновлены |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm test` | 48+ файлов, 625+ тестов зелёные |
| Lint | `npm run lint` | НЕ gate (19 ошибок уже на `2d9f2c7`); gate: нет новых |
| Dev server | `npm run dev -- -p 3001` | порт 3001 (3000 занят основным чекаутом — не убивать) |
| E2E | `npm run test:e2e` | все спеки зелёные (AI-флаг выключен по умолчанию — e2e идут по regex-пути) |

## Suggested executor toolkit

- Прочитать перед шагом 3: гайд по Route Handlers в `node_modules/next/dist/docs/` (см. AGENTS.md — API этой версии Next.js может отличаться от привычного).
- Vercel AI SDK v6: `generateObject({ model, schema, system, prompt })` из пакета `ai`, провайдер `google`/`createGoogleGenerativeAI` из `@ai-sdk/google`. После `npm install` сверить актуальные сигнатуры и текущий id Flash-модели по типам установленных пакетов и их README в node_modules — НЕ по памяти (id моделей Gemini меняются).

## Scope

**In scope:**
- `docs/ai-workflow-integration-spike.md` (создать — дизайн-док)
- `src/app/api/ai/workflow-ops/route.ts` (создать)
- `src/lib/ai-workflow-client.ts` (создать)
- `src/lib/ai-workflow-schema.ts` (создать — zod-зеркало StructuralOp)
- `src/lib/ai-workflow-schema.test.ts` (создать)
- `src/sections/shell/prompt-composer.tsx` (минимальная async-ветка под флагом)
- `src/state/dev-config.ts` (добавить флаг)
- `.env.example` (создать), `package.json` (+zod, +@ai-sdk/google)

**Out of scope (НЕ трогать):**
- `src/state/structural-commands.ts` — regex-парсер остаётся как fallback и как единственный путь при выключенном флаге.
- `src/lib/trigger-edit-parser.ts`, `mock-ai-reply.ts`, `informational-replies.ts`, `stats-query-matcher.ts` — только упоминание в дизайн-доке.
- `workflow-view.tsx`, `workflow-section.tsx`, `app-state.ts` — пайплайн применения не меняется (в этом смысл архитектуры).
- Стриминг, история диалога, контекст всего аккаунта — за рамками спайка.

## Git workflow

```bash
git worktree add .worktrees/ai-workflow-spike -b feature/ai-workflow-spike main
cd .worktrees/ai-workflow-spike && npm install
```

Conventional commits с русским описанием (`feat(ai): ...`). Не пушить в main; PR — решение оператора.

## Steps

### Step 1: Дизайн-док

Создать `docs/ai-workflow-integration-spike.md` (по-русски, как остальные docs/):

1. **Таксономия запросов** и их сегодняшние mock-обработчики: структурные команды графа (`parseStructuralCommands`), правки параметров ноды (`deriveParamsPatch` в workflow-view), правки триггеров (`parseTriggerCommand`), статистика (`matchStatsQuery`), информационные вопросы (`lookupInformationalReply`).
2. **Контракт**: AI-эндпоинт на каждый тип возвращает РОВНО тот тип, который сегодня выдаёт regex; аппликаторы не меняются. Privacy-граница: на сервер уходит текст команды + краткая сводка графа (типы и подписи нод), не весь стейт.
3. **Fallback-цепочка**: флаг выключен → regex; флаг включен, но эндпоинт вернул ошибку/429 (квота free tier исчерпана)/таймаут (4с)/пустой список → regex; оба пусты → текущий путь «Команда не распознана». Оговорки free tier зафиксировать в доке: данные запросов Google может использовать для обучения (приемлемо — уходят только команды и типы нод мокового графа, ничего чувствительного), квоты Google периодически урезает — поэтому regex-fallback не временный костыль, а постоянная часть архитектуры.
4. **Latency-UX**: цикл «Думаю...» сегодня фиксированные 3–5с; с реальным вызовом — старт цикла сразу, минимум 1.5с на «магию», максимум до прихода ответа.
5. **Решённое и открытые вопросы.** Решено оператором (2026-06-11): провайдер — Gemini Flash через `@ai-sdk/google`, бесплатный тариф (оператор в Грузии, прямой доступ, ключ без карты с aistudio.google.com). Открытыми остаются: переход на платный тариф или другого провайдера при выходе за free tier (кандидаты: gpt-4o-mini, Claude Haiku 4.5) и потолок стоимости, нужен ли стриминг reasoning-шагов, выкатка за пределы dev-флага.

**Verify**: файл существует, покрывает все 5 разделов.

### Step 2: zod-схема — зеркало StructuralOp

`src/lib/ai-workflow-schema.ts`: zod-схемы `placementSchema` (discriminated union по `mode`), `structuralOpSchema` (discriminated union по `kind`), `workflowOpsResultSchema = z.object({ ops: z.array(structuralOpSchema) })`. Enum типов нод — построить из реального списка `WorkflowNodeType` в `src/types/workflow.ts` (открыть и переписать точно). Экспортировать также выведенный тип и проверить совместимость на уровне типов: `const _check: StructuralOp[] = ({} as z.infer<typeof workflowOpsResultSchema>).ops;`

`src/lib/ai-workflow-schema.test.ts`: валидный add/remove/replace парсится; неизвестный `kind` и неизвестный `nodeType` отклоняются; результат присваим в `StructuralOp[]` (компиляция файла — уже проверка).

**Verify**: `npm test -- ai-workflow-schema` → зелёные; `npx tsc --noEmit` → exit 0.

### Step 3: Route handler

Прочитать гайд по route handlers в `node_modules/next/dist/docs/`. Создать `src/app/api/ai/workflow-ops/route.ts`:

- `POST`, тело: `{ text: string; nodes: Array<{ id: string; label: string; nodeType: string }> }`.
- Если `!process.env.GOOGLE_GENERATIVE_AI_API_KEY` → `503` c `{ error: "no-key" }` (клиент уйдёт в fallback).
- Иначе `generateObject` из `ai` с моделью `google(modelId)` из `@ai-sdk/google` (modelId по env `AFINA_AI_MODEL`; дефолт — константа в коде с актуальным id Flash-модели, взятым из типов/README установленного `@ai-sdk/google`, НЕ по памяти) со схемой из шага 2. System-prompt: по-русски; перечислить допустимые `nodeType` и правила `ref` (как пользователь называет ноды — словарь синонимов из `REF_SYNONYMS` в `structural-commands.ts:52` включить в текст промпта); инструкция «не уверен — верни пустой ops».
- Ошибка 429 от провайдера (квота free tier: ~15 запросов/мин) → `502` с `{ error: "rate-limited" }`; любая другая ошибка SDK → `502` с `{ error: "ai-failed" }`. Клиент оба случая трактует одинаково — fallback на regex. Текст пользовательской команды не логировать.

**Verify**: `npx tsc --noEmit` → exit 0; `curl -s -X POST localhost:3001/api/ai/workflow-ops -H 'content-type: application/json' -d '{"text":"x","nodes":[]}'` без ключа → HTTP 503, `{"error":"no-key"}`.

### Step 4: Клиентский помощник + флаг

- В `src/state/dev-config.ts` по образцу `DEV_PROCESSING_KEY`: ключ `afina.dev.aiParser` (`"on"`/`"off"`, дефолт off), геттер `isAiParserEnabled()` (SSR-safe → false) и сеттер.
- `src/lib/ai-workflow-client.ts`: `fetchAiStructuralOps(text, nodes): Promise<StructuralOp[] | null>` — POST на эндпоинт, `AbortSignal.timeout(4000)`, не-2xx/исключение/пустой массив → `null`. Валидировать ответ той же zod-схемой (защита от дрейфа контракта).

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: Интеграция в prompt-composer под флагом

В `prompt-composer.tsx`, в ветке free-text (строки 294-322): если `isAiParserEnabled()` И есть `rawText` без node-тегов И regex дал `structural.ops.length === 0` — НЕ диспатчить `workflow_command_submit` сразу, а: эхо пользователя в чат (как делает существующий код), затем `void (async () => { const ops = await fetchAiStructuralOps(...); if (ops?.length) dispatch({ type: "workflow_structural_commands_submit", ops }); else dispatch({ type: "workflow_command_submit", text: rawText }); })()`. Сводку `nodes` для запроса получить из доступного в композере источника графа; если граф в композере недоступен — передать пустой массив и зафиксировать это ограничение в дизайн-доке (STOP не нужен). При выключенном флаге поведение бит-в-бит как сейчас.

**Verify**: `npm test` → зелёные; `npm run test:e2e` → зелёные (флаг off по умолчанию).

### Step 6: env-гигиена

`.env.example`: строки `GOOGLE_GENERATIVE_AI_API_KEY=` и `AFINA_AI_MODEL=` с комментарием на русском: ключ берётся бесплатно на aistudio.google.com («Get API key», карта не нужна), без ключа работает regex-fallback. Убедиться, что `.gitignore` покрывает `.env*` кроме `.env.example` (у create-next-app обычно покрывает — проверить, при необходимости дополнить).

**Verify**: `git status` → `.env.example` отслеживается, реальных `.env` в диффе нет.

### Step 7: Живая проверка (если у оператора есть ключ)

С `GOOGLE_GENERATIVE_AI_API_KEY` в `.env.local` (ключ оператор берёт на aistudio.google.com), dev-сервер на 3001, флаг включить через localStorage (`afina.dev.aiParser = on`). В черновике воркфлоу дать команду, которую regex не понимает, например: «сначала пуш, если не открыл — письмо через день». Ожидание: цикл «Думаю...», граф перестроился (push + wait + email), ответ в чате перечисляет операции.

**Verify**: сценарий воспроизведён. Без ключа — пометить «live call not verified» в отчёте и убедиться, что fallback-путь работает (команда уходит в «Команда не распознана» как раньше).

## Test plan

- `src/lib/ai-workflow-schema.test.ts` — валидация/отклонение, совместимость типов (шаг 2).
- Существующие `structural-commands.test.ts` — без правок, зелёные (regex-путь не тронут).
- E2E — весь набор зелёный при выключенном флаге (regex-путь бит-в-бит).
- Live-проверка шага 7 — при наличии ключа.

## Done criteria

- [ ] `npx tsc --noEmit` exit 0; `npm test` exit 0 (новые схемные тесты проходят)
- [ ] `npm run test:e2e` exit 0 при выключенном флаге
- [ ] `curl` без ключа на эндпоинт → 503 `no-key`
- [ ] `grep -rn "GOOGLE_GENERATIVE_AI_API_KEY" src/` встречается только в серверном route handler (не в клиентском коде)
- [ ] `docs/ai-workflow-integration-spike.md` существует, содержит 5 разделов, включая открытые вопросы оператору
- [ ] `git status` — только in-scope файлы; никаких `.env` с значениями
- [ ] Строка плана в `plans/README.md` обновлена

## STOP conditions

Остановиться и доложить, если:

- Сигнатура `generateObject`/провайдера в установленных версиях `ai@6`/`@ai-sdk/google` не совпадает с ожидаемой и не восстанавливается из типов пакета за разумное время, либо `@ai-sdk/google` несовместим с установленной мажорной версией `ai`.
- Route handlers в этой версии Next.js 16 устроены иначе, чем описано в `node_modules/next/dist/docs/` (или гайд отсутствует).
- Интеграция в `prompt-composer.tsx` требует менять `app-state.ts` или `workflow-view.tsx` (out of scope — значит, контракт спроектирован неверно, нужно решение).
- Обнаружено, что `dispatch` из async-замыкания после ухода с экрана воркфлоу ломает стейт (команда применяется к чужому view) — зафиксировать и предложить guard, не чинить молча.
- Любой шаг подталкивает закоммитить значение ключа.

## Maintenance notes

- Следующий кандидат на тот же контракт — `parseTriggerCommand` (правки триггеров): схема проще (add/exclude domains), эндпоинт-близнец.
- Ревьюеру смотреть: privacy-границу (что именно уходит на сервер), таймаут/фоллбек (UX не должен зависать без сети), отсутствие ключа в клиентском бандле.
- Фиксированная длительность цикла «Думаю...» (3–5с) при реальном AI должна стать «до прихода ответа, минимум 1.5с» — сознательно отложено до решения открытых вопросов (раздел 5 дизайн-дока).
- plans/001 обязателен перед включением флага на демо: сетевые задержки делают гонки применения регулярными.
