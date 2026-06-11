# Plan 004: Оркестратор `/api/ai/assist` — база знаний, `answer` и `clarify`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **REQUIRED SUB-SKILL**: superpowers:executing-plans (или
> superpowers:subagent-driven-development). Шаги — чекбоксы.
>
> **Drift check (run first)**:
> `git diff --stat c2513c6..HEAD -- src/sections/shell/use-chat-submit.ts src/state/dev-config.ts src/lib/ai-workflow-client.ts src/lib/informational-replies.ts src/state/chat-context.tsx package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against live code; on a mismatch — STOP condition.

## Status

- **Priority**: P1 (фундамент всей серии 004–007)
- **Effort**: L (контентная работа по знаниям + первый оркестратор-эндпоинт)
- **Risk**: MED (новая архитектура промпта; смягчается фоллбеком бит-в-бит)
- **Depends on**: планы 001–003 (DONE, ветка `feat/plans-001-003`)
- **Spec**: `docs/superpowers/specs/2026-06-11-ai-orchestrator-design.md` (§2–5, §7, §9, §11–13, §16)
- **Planned at**: commit `c2513c6`, 2026-06-11

## Why this matters

Спека утвердила архитектуру «оркестратор + инструменты». Этот план кладёт
фундамент: четырёхслойный системный промпт (роль → знания → контекст →
инструменты), базу знаний о продукте и два первых инструмента — `answer`
(осмысленный ответ по реальным данным стейта) и `clarify` (1 раунд, ≤2
вопроса). Дальнейшие планы (005–006) только регистрируют новые инструменты
в уже работающий оркестратор.

Вертикальный срез плана: вопрос «какая кампания принесла больше всего?» в
чате получает ответ с реальными цифрами вместо «Свободные формулировки я ещё
осваиваю…».

## Current state

- Рабочий AI-эндпоинт спайка: `src/app/api/ai/workflow-ops/route.ts` —
  образец route handler, обработки ошибок (503 no-key / 502 rate-limited|ai-failed),
  системного промпта. НЕ трогаем (поглощение — план 007).
- `src/lib/ai-workflow-client.ts` — образец клиента: `fetchAiAvailability()`
  (GET-проба, кэш на page lifetime), `AbortSignal.timeout(4000)`, zod-валидация
  ответа.
- `src/state/dev-config.ts` — паттерн dev-флагов: SSR-safe геттеры,
  ключи `afina.dev.*`. `isAiParserEnabled()` — авто-он (default true).
- Чат: `src/state/chat-context.tsx` — `useChat()` даёт
  `messages: ChatMessage[]` (поля `role: "user"|"assistant"`, `text`,
  `pending?`), `append(...)` возвращает id, `updatePending(id, text)`.
- Финальный фоллбек свободного текста: `src/sections/shell/use-chat-submit.ts`
  строки 338–344:

```ts
chat.append({ role: "user", text });
const id = chat.append({ role: "assistant", text: "", pending: true });
const reply = lookupInformationalReply(text) ?? warmFallbackReply();
schedule(() => chat.updatePending(id, reply), 350);
```

- Данные для сводки: `AppState.campaigns: Campaign[]` (`id,name,status,budget,
  scenario?,signalId,createdAt`), `AppState.signals: Signal[]` (`id,type,name?,
  count,segments{max,high,mid,low}`), статистика — `src/sections/statistics/
  fact-cube.ts` (`aggregate(facts): FunnelNumbers`, поля `sends,clicks,actions,
  holds,approves,rejects,expensesUsd,incomeUsd`).
- Источники знаний: `docs/interface-overview.md`, `docs/interface-flows.md`,
  `docs/wiki.md`, `docs/onboarding-flow.md`, `docs/triggers-model-prototype.md`,
  `docs/signal-flow-konfiguratsiya.md`, `PRODUCT.md`,
  `src/lib/informational-replies.ts` (ENTRIES, ~40 записей),
  `src/data/scenarios.ts` (36 сценариев), визард: 8 шагов в
  `src/sections/signals/campaign-stepper.tsx` (`STEPPER_ITEMS`).
- Тесты: vitest, colocated `*.test.ts`; `npm test` зелёный на базовом коммите.
- `ai@6.0.146`, `@ai-sdk/google@3.0.80`, `zod@4.4.3` установлены.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm test` | все зелёные (650+ на базе) |
| Dev server | `npm run dev -- -p 3001` | порт 3001 (3000 не убивать) |
| E2E | `npm run test:e2e` | зелёные (идут по пути «нет ключа») |
| Lint | `npm run lint` | НЕ gate; gate: нет НОВЫХ ошибок |

## Scope

**In scope (create):**
- `src/lib/ai/afina-knowledge.ts` + `src/lib/ai/afina-knowledge.test.ts`
- `src/lib/ai/orchestrator-prompt.ts` + `src/lib/ai/orchestrator-prompt.test.ts`
- `src/lib/ai/assist-contract.ts` + `src/lib/ai/assist-contract.test.ts`
- `src/lib/ai/data-summary.ts` + `src/lib/ai/data-summary.test.ts`
- `src/app/api/ai/assist/route.ts`
- `src/lib/ai/assist-client.ts`
- `docs/ai-orchestrator.md`

**In scope (modify):**
- `src/sections/shell/use-chat-submit.ts` — только финальный фоллбек-бранч
- `plans/README.md` — строка статуса

**Out of scope (НЕ трогать):**
- `src/app/api/ai/workflow-ops/route.ts`, `src/lib/ai-workflow-client.ts`,
  `src/lib/ai-workflow-schema.ts` — живут до плана 007
- `prompt-composer.tsx` — интеграция воркфлоу-инструментов — план 005
- `informational-replies.ts` — остаётся офлайн-fallback, код не меняется
- welcome-чат, стриминг, новые view

## Git workflow

Работа в существующем ворктри `.worktrees/plans-001-003`, ветка
`feat/plans-001-003` (серия 004–007 исполняется последовательно в нём же).
Conventional commits с русским описанием, коммит после каждого шага с verify.

## Steps

### Step 1: База знаний — `afina-knowledge.ts` (контентная работа)

- [ ] Прочитать целиком: `PRODUCT.md`, `docs/interface-overview.md`,
  `docs/wiki.md`, `docs/onboarding-flow.md`, `src/lib/informational-replies.ts`
  (все ENTRIES), `src/sections/signals/campaign-stepper.tsx` (STEPPER_ITEMS).
- [ ] Создать `src/lib/ai/afina-knowledge.ts` — один экспорт
  `AFINA_KNOWLEDGE: string` (template literal, по-русски). Семь разделов
  ровно по §5 спеки, каждый с маркдаун-заголовком `##`:

```ts
/**
 * База знаний Афины для системного промпта оркестратора.
 * ЕДИНСТВЕННЫЙ источник «эрудиции» модели о продукте.
 * Обновлять в том же PR, что меняет продукт. Объём держать в 3–4K токенов
 * (~9–12K символов кириллицей) — см. тест на бюджет.
 */
export const AFINA_KNOWLEDGE = `
## Что такое Афина
Афина — AI-first платформа интент-маркетинга для B2B-маркетологов. <...дистилляция из PRODUCT.md, 3–5 предложений...>

## Сущности и связи
Сигнал — сегмент горячей аудитории, собранный по интент-триггерам. <...>
Цепочка: сигнал → триггеры (наборы доменов) → сегменты (max/high/mid/low) → кампания → воркфлоу (граф касаний).

## Карта интерфейса
Разделы: Сигналы, Кампании, Статистика, Настройки.
Визард сигнала, 8 шагов: 1 Выбор сценария, 2 Интересы (здесь триггеры и домены), 3 Сегменты, 4 База, 5 Бюджет, 6 Сводка, 7 Обработка, 8 Результат.
<...что где настраивается: триггеры — шаг 2; бюджет — шаг 5; запуск кампании — экран воркфлоу...>

## Границы: чего Афина НЕ умеет
Нет интеграций с внешними рекламными кабинетами (Яндекс.Директ, VK и др.). Нет экспорта данных. <...перечислить честно по docs/...>
На вопросы за границей отвечай: «В Афине этого пока нет» — не выдумывай кнопки и не отсылай к другим продуктам.

## Правила ответов
Отвечай 1–3 предложениями, уверенно и спокойно. Никогда не объясняй внутреннюю механику (алгоритмы, парсинг, модели) — показывай результат. Не упоминай другие продукты как референс. Не уверен — задай вопрос или признайся, что не знаешь.

## Словарь пользователя
«сообщения» — смс и/или пуш; «письма», «почта» — email; «звонки», «обзвон» — IVR; «контактная политика» — задержки и условия между касаниями; «касание» — любая коммуникационная нода.

## Уточняющие вопросы для сборки воркфлоу
Если просят собрать/пересобрать цепочку без деталей, спроси максимум два из: во что конвертируем (цель)? какие каналы доступны/предпочтительны? как быстро и как настойчиво (сколько касаний, какие паузы)?
`.trim();
```

  Плейсхолдеры `<...>` в плане — указание дистиллировать из перечисленных
  источников; в итоговом файле их быть не должно. Факты из
  informational-replies переформулировать, не копировать дословно списком.
- [ ] Создать `src/lib/ai/afina-knowledge.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AFINA_KNOWLEDGE } from "./afina-knowledge";

describe("AFINA_KNOWLEDGE", () => {
  it("содержит все 7 разделов", () => {
    for (const h of [
      "## Что такое Афина",
      "## Сущности и связи",
      "## Карта интерфейса",
      "## Границы",
      "## Правила ответов",
      "## Словарь пользователя",
      "## Уточняющие вопросы",
    ]) {
      expect(AFINA_KNOWLEDGE).toContain(h);
    }
  });
  it("укладывается в токен-бюджет (≈4K токенов ≤ 16000 символов)", () => {
    expect(AFINA_KNOWLEDGE.length).toBeGreaterThan(2000);
    expect(AFINA_KNOWLEDGE.length).toBeLessThan(16000);
  });
  it("не содержит плейсхолдеров", () => {
    expect(AFINA_KNOWLEDGE).not.toMatch(/<\.\.\.|TBD|TODO/);
  });
});
```

- [ ] `npm test -- afina-knowledge` → зелёный; `npx tsc --noEmit` → exit 0.
- [ ] **Verify (контент)**: показать файл оператору на ревью КАК ТЕКСТ
  (спека §16: ревью оператором). Если исполнение автономное — пометить в
  отчёте «knowledge: ожидает контент-ревью оператора».
- [ ] Commit: `feat(ai): база знаний Афины для оркестратора`

### Step 2: Контракт — `assist-contract.ts` (типы + zod, общие для клиента и сервера)

- [ ] Создать `src/lib/ai/assist-contract.ts`:

```ts
import { z } from "zod";

/** Сообщение истории сессии (последние N из chat-context). */
export const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});
export type HistoryMessage = z.infer<typeof historyMessageSchema>;

/** Контекст момента — собирает клиент, расширяется планами 005/006. */
export const assistContextSchema = z.object({
  screen: z.string(), // "section:Статистика" | "workflow" | "guided-signal:2" | ...
  dataSummary: z.string(), // компактный текст из data-summary.ts
});
export type AssistContext = z.infer<typeof assistContextSchema>;

export const assistRequestSchema = z.object({
  text: z.string().min(1),
  history: z.array(historyMessageSchema).max(8),
  context: assistContextSchema,
});
export type AssistRequest = z.infer<typeof assistRequestSchema>;

/** Результат: какой инструмент вызвала модель. Планы 005/006 добавляют kind'ы. */
export const assistResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("answer"), text: z.string() }),
  z.object({ kind: z.literal("clarify"), questions: z.array(z.string()).min(1).max(2) }),
  z.object({ kind: z.literal("none") }), // модель не вызвала инструмент
]);
export type AssistResult = z.infer<typeof assistResultSchema>;
```

- [ ] Создать `src/lib/ai/assist-contract.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assistRequestSchema, assistResultSchema } from "./assist-contract";

describe("assist-contract", () => {
  it("валидный запрос проходит", () => {
    const r = assistRequestSchema.safeParse({
      text: "какая кампания лучшая?",
      history: [{ role: "user", text: "привет" }],
      context: { screen: "section:Статистика", dataSummary: "кампаний: 3" },
    });
    expect(r.success).toBe(true);
  });
  it("история длиннее 8 отклоняется", () => {
    const history = Array.from({ length: 9 }, () => ({ role: "user" as const, text: "x" }));
    expect(assistRequestSchema.safeParse({
      text: "y", history, context: { screen: "s", dataSummary: "" },
    }).success).toBe(false);
  });
  it("clarify с 3 вопросами отклоняется", () => {
    expect(assistResultSchema.safeParse({
      kind: "clarify", questions: ["a", "b", "c"],
    }).success).toBe(false);
  });
  it("неизвестный kind отклоняется", () => {
    expect(assistResultSchema.safeParse({ kind: "magic" }).success).toBe(false);
  });
});
```

- [ ] `npm test -- assist-contract` → зелёный; `npx tsc --noEmit` → exit 0.
- [ ] Commit: `feat(ai): контракт assist-эндпоинта (zod)`

### Step 3: Сводка данных — `data-summary.ts`

- [ ] Создать `src/lib/ai/data-summary.ts`. Вход — куски AppState (не весь
  стейт — функция должна быть тестируемой без провайдеров):

```ts
import type { Campaign, Signal } from "@/state/app-state";

/**
 * Компактная текстовая сводка реального стейта для промпта оркестратора.
 * Только то, что нужно для ответов: имена/статусы/бюджеты кампаний,
 * сигналы с размерами сегментов. Без параметров нод, без ключей.
 * Формат — плоский текст: модель читает его лучше, чем JSON, и он дешевле.
 */
export function buildDataSummary(input: {
  campaigns: Campaign[];
  signals: Signal[];
  /** Готовые строки статистики — собирает вызывающий из fact-cube (см. ниже). */
  statsLines?: string[];
}): string {
  const lines: string[] = [];
  lines.push(`Кампаний: ${input.campaigns.length}`);
  for (const c of input.campaigns.slice(0, 20)) {
    lines.push(
      `- кампания "${c.name}" (id ${c.id}): статус ${c.status}` +
        (c.budget ? `, бюджет ${c.budget} ₽` : "") +
        (c.scenario ? `, сценарий «${c.scenario.name}»` : "")
    );
  }
  lines.push(`Сигналов: ${input.signals.length}`);
  for (const s of input.signals.slice(0, 20)) {
    lines.push(
      `- сигнал "${s.name ?? s.type}" (id ${s.id}): тип ${s.type}, ` +
        `аудитория ${s.count}, сегменты max ${s.segments.max} / high ${s.segments.high} / mid ${s.segments.mid} / low ${s.segments.low}`
    );
  }
  if (input.statsLines?.length) {
    lines.push("Статистика:");
    lines.push(...input.statsLines);
  }
  return lines.join("\n");
}
```

- [ ] В этом же шаге написать хелпер сбора statsLines на клиенте. Открыть
  `src/sections/statistics/fact-cube.ts`, найти экспортируемую функцию
  построения фактов по кампаниям (по исследованию — `buildCampaignFacts`
  либо `buildFacts`; взять реальное имя из файла) и `aggregate(facts)`.
  Добавить в `data-summary.ts`:

```ts
import type { FunnelNumbers } from "@/state/metrics"; // сверить реальный путь типа

/** Строки агрегатов для сводки: общий доход/расход/отправки за всё время. */
export function statsLinesFromFunnel(total: FunnelNumbers): string[] {
  return [
    `- всего: отправок ${total.sends}, кликов ${total.clicks}, конверсий ${total.approves}`,
    `- деньги: доход $${Math.round(total.incomeUsd)}, расход $${Math.round(total.expensesUsd)}`,
  ];
}
```

  Если имена/типы в fact-cube отличаются — взять фактические; если построение
  фактов требует `now: Date`, передавать `new Date()` в месте вызова (клиент).
- [ ] Создать `src/lib/ai/data-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDataSummary, statsLinesFromFunnel } from "./data-summary";

const campaign = {
  id: "c1", name: "Ипотека-лето", signalId: "s1", status: "active" as const,
  createdAt: "2026-06-01", budget: 50000, scenario: { id: "x", name: "Горячий интент" },
};
const signal = {
  id: "s1", type: "Первая сделка" as const, name: "Ипотека",
  count: 1200, segments: { max: 100, high: 300, mid: 500, low: 300 },
  createdAt: "2026-06-01", updatedAt: "2026-06-01",
};

describe("buildDataSummary", () => {
  it("включает кампании с именем, статусом и бюджетом", () => {
    const s = buildDataSummary({ campaigns: [campaign], signals: [signal] });
    expect(s).toContain("Ипотека-лето");
    expect(s).toContain("active");
    expect(s).toContain("50000");
    expect(s).toContain("Ипотека");
  });
  it("режет списки до 20 позиций", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...campaign, id: `c${i}`, name: `К${i}` }));
    const s = buildDataSummary({ campaigns: many, signals: [] });
    expect(s).toContain("Кампаний: 30");
    expect(s).not.toContain('"К25"');
  });
  it("statsLines попадают в сводку", () => {
    const s = buildDataSummary({
      campaigns: [], signals: [],
      statsLines: statsLinesFromFunnel({
        sends: 10, clicks: 5, actions: 3, holds: 1, approves: 2, rejects: 0,
        expensesUsd: 100, incomeUsd: 300,
      }),
    });
    expect(s).toContain("доход $300");
  });
});
```

  (Поля `FunnelNumbers` сверить с реальным типом; при расхождении поправить
  тест и `statsLinesFromFunnel` под фактические поля.)
- [ ] `npm test -- data-summary` → зелёный; `npx tsc --noEmit` → exit 0.
- [ ] Commit: `feat(ai): сводка данных стейта для промпта оркестратора`

### Step 4: Сборка промпта — `orchestrator-prompt.ts`

- [ ] Создать `src/lib/ai/orchestrator-prompt.ts`:

```ts
import { AFINA_KNOWLEDGE } from "./afina-knowledge";
import type { AssistContext, HistoryMessage } from "./assist-contract";

/** Слой 1: роль и голос (PRODUCT.md: уверенный, точный, ненавязчивый). */
const ROLE_AND_VOICE = `Ты — Афина, AI-ассистент внутри одноимённой платформы интент-маркетинга.
Голос: уверенный, точный, ненавязчивый. Спокойная уверенность без рывков.
Ты действуешь ТОЛЬКО через предоставленные инструменты. Правила поведения:
1. Понял запрос → вызови подходящий инструмент и в подтверждении скажи, что именно сделал.
2. Запрос неоднозначен или просят собрать что-то без деталей → вызови clarify (один раунд, максимум 2 вопроса). После ответов пользователя (они придут в истории) — действуй и проговори допущения.
3. Не понял → вызови answer с честным «не понял, скажите иначе».
Запрещено: молча делать не то; выдумывать возможности, которых нет в базе знаний; ссылаться на другие продукты.
Явное пожелание пользователя всегда побеждает любые твои соображения о «правильном».`;

/** Полный system prompt: роль → знания → контекст момента. */
export function buildSystemPrompt(context: AssistContext): string {
  return [
    ROLE_AND_VOICE,
    "# База знаний Афины",
    AFINA_KNOWLEDGE,
    "# Контекст момента",
    `Пользователь сейчас на экране: ${context.screen}`,
    "Данные аккаунта (моки прототипа):",
    context.dataSummary,
  ].join("\n\n");
}

/** История + текущий вопрос → messages для generateText. */
export function buildMessages(history: HistoryMessage[], text: string) {
  return [
    ...history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    })),
    { role: "user" as const, content: text },
  ];
}
```

- [ ] Создать `src/lib/ai/orchestrator-prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildMessages } from "./orchestrator-prompt";

describe("buildSystemPrompt", () => {
  it("содержит все четыре слоя в порядке: роль → знания → контекст", () => {
    const p = buildSystemPrompt({ screen: "workflow", dataSummary: "Кампаний: 2" });
    const roleIdx = p.indexOf("Ты — Афина");
    const knowledgeIdx = p.indexOf("# База знаний");
    const contextIdx = p.indexOf("# Контекст момента");
    expect(roleIdx).toBeGreaterThanOrEqual(0);
    expect(knowledgeIdx).toBeGreaterThan(roleIdx);
    expect(contextIdx).toBeGreaterThan(knowledgeIdx);
    expect(p).toContain("Кампаний: 2");
    expect(p).toContain("workflow");
  });
});

describe("buildMessages", () => {
  it("история идёт перед текущим вопросом", () => {
    const m = buildMessages(
      [{ role: "user", text: "сколько потратили в июне?" },
       { role: "assistant", text: "В июне — $1200." }],
      "а в мае?"
    );
    expect(m).toHaveLength(3);
    expect(m[2]).toEqual({ role: "user", content: "а в мае?" });
  });
});
```

- [ ] `npm test -- orchestrator-prompt` → зелёный; `npx tsc --noEmit` → exit 0.
- [ ] Commit: `feat(ai): сборка четырёхслойного промпта оркестратора`

### Step 5: Route handler `/api/ai/assist`

- [ ] Прочитать гайд по Route Handlers в `node_modules/next/dist/docs/`
  (AGENTS.md: Next.js 16 может отличаться от привычного) и сверить сигнатуру
  `generateText` + `tool` в `node_modules/ai` (README/типы; `generateObject`
  deprecated — здесь используем `generateText` с `tools`, это и есть
  миграция, о которой говорил техдолг спайка).
- [ ] Создать `src/app/api/ai/assist/route.ts`:

```ts
/**
 * POST /api/ai/assist — оркестратор: единая точка входа всех AI-запросов.
 * Модель выбирает инструмент из зарегистрированных; набор инструментов
 * фильтруется по context.screen (планы 005/006 расширяют набор).
 * Privacy: текст, история (≤8), сводка моковых данных. Не логировать тексты.
 */
import { google } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";
import { assistRequestSchema, type AssistResult } from "@/lib/ai/assist-contract";
import { buildSystemPrompt, buildMessages } from "@/lib/ai/orchestrator-prompt";

export function GET() {
  return Response.json({
    available: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  });
}

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  let parsed;
  try {
    parsed = assistRequestSchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }
  const { text, history, context } = parsed.data;

  // Результат заполняет execute вызванного инструмента. Модель Gemini Flash
  // вызывает максимум один инструмент за ход; составные действия — план 006.
  let result: AssistResult = { kind: "none" };

  const tools = {
    answer: tool({
      description:
        "Ответить пользователю текстом: на вопрос по данным, по продукту, " +
        "или честно сказать, что не понял. Единственный способ говорить с пользователем.",
      inputSchema: z.object({
        text: z.string().describe("Ответ, 1–3 предложения, в голосе продукта"),
      }),
      execute: ({ text: answerText }) => {
        result = { kind: "answer", text: answerText };
        return "ok";
      },
    }),
    clarify: tool({
      description:
        "Задать 1–2 уточняющих вопроса, когда запрос неоднозначен. " +
        "Только один раунд: если в истории уже есть твои вопросы — не вызывай повторно.",
      inputSchema: z.object({
        questions: z.array(z.string()).min(1).max(2),
      }),
      execute: ({ questions }) => {
        result = { kind: "clarify", questions };
        return "ok";
      },
    }),
  };

  const modelId = process.env.AFINA_AI_MODEL ?? "gemini-2.5-flash";
  try {
    await generateText({
      model: google(modelId),
      system: buildSystemPrompt(context),
      messages: buildMessages(history, text),
      tools,
      toolChoice: "required",
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const s = String(err).toLowerCase();
    const rateLimited = s.includes("429") || s.includes("rate") || s.includes("quota");
    console.error("[ai/assist] LLM call failed:", rateLimited ? "rate-limited" : "ai-failed");
    return Response.json(
      { error: rateLimited ? "rate-limited" : "ai-failed" },
      { status: 502 }
    );
  }
}
```

  Сигнатуру `tool({ description, inputSchema, execute })` сверить с
  установленной `ai@6` (поле может называться `parameters` в этой мажорной
  версии — взять фактическое из типов, НЕ по памяти). `toolChoice: "required"`
  сверить аналогично; если значение не поддерживается — убрать и положиться
  на промпт («действуешь только через инструменты»).
- [ ] `npx tsc --noEmit` → exit 0.
- [ ] Без ключа: `npm run dev -- -p 3001`, затем
  `curl -s -X POST localhost:3001/api/ai/assist -H 'content-type: application/json' -d '{"text":"x","history":[],"context":{"screen":"s","dataSummary":""}}'`
  → HTTP 503 `{"error":"no-key"}`;
  `curl -s localhost:3001/api/ai/assist` → `{"available":false}`.
- [ ] Commit: `feat(ai): оркестратор /api/ai/assist с инструментами answer и clarify`

### Step 6: Клиент — `assist-client.ts`

- [ ] Создать `src/lib/ai/assist-client.ts` (по образцу `ai-workflow-client.ts`):

```ts
import {
  assistResultSchema,
  type AssistRequest,
  type AssistResult,
} from "./assist-contract";

let availabilityCache: Promise<boolean> | null = null;

/** GET-проба ключа; кэш на page lifetime (как fetchAiAvailability спайка). */
export function fetchAssistAvailability(): Promise<boolean> {
  if (!availabilityCache) {
    availabilityCache = fetch("/api/ai/assist")
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((j: { available?: boolean }) => Boolean(j.available))
      .catch(() => false);
  }
  return availabilityCache;
}

/**
 * Вызов оркестратора. null = любой сбой (таймаут 6с, не-2xx, невалидный
 * ответ) — вызывающий уходит в офлайн-fallback.
 */
export async function fetchAssist(req: AssistRequest): Promise<AssistResult | null> {
  try {
    const res = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const parsed = assistResultSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
```

- [ ] `npx tsc --noEmit` → exit 0.
- [ ] Commit: `feat(ai): клиент оркестратора с таймаутом и валидацией`

### Step 7: Интеграция в финальный фоллбек чата

- [ ] В `src/sections/shell/use-chat-submit.ts`: добавить импорты

```ts
import { fetchAssist, fetchAssistAvailability } from "@/lib/ai/assist-client";
import { buildDataSummary } from "@/lib/ai/data-summary";
import { isAiParserEnabled } from "@/state/dev-config";
```

  В хуке завести пробу доступности (тот же паттерн, что в prompt-composer
  строки 137–145: `useState(false)` + `useEffect` с флагом alive).
- [ ] Заменить финальный фоллбек (строки 338–344) на:

```ts
// Финальный фоллбек: AI-оркестратор (когда есть ключ), иначе — как раньше.
chat.append({ role: "user", text });
const id = chat.append({ role: "assistant", text: "", pending: true });
const useAi = isAiParserEnabled() && assistAvailable;
if (useAi) {
  // История — до текущего сообщения; последние 8, без pending.
  const history = chat.messages
    .filter((m) => !m.pending)
    .slice(-8)
    .map((m) => ({ role: m.role, text: m.text }));
  const screen =
    view.kind === "section" ? `section:${view.name}` : view.kind;
  const dataSummary = buildDataSummary({ campaigns, signals });
  void fetchAssist({ text, history, context: { screen, dataSummary } }).then(
    (result) => {
      if (result?.kind === "answer") {
        chat.updatePending(id, result.text);
      } else if (result?.kind === "clarify") {
        chat.updatePending(id, result.questions.join(" "));
      } else {
        // null или none → офлайн-каталог, затем тёплый фоллбек
        chat.updatePending(id, lookupInformationalReply(text) ?? warmFallbackReply());
      }
    }
  );
} else {
  const reply = lookupInformationalReply(text) ?? warmFallbackReply();
  schedule(() => chat.updatePending(id, reply), 350);
}
```

  `campaigns`, `signals`, `view` взять из уже доступного в хуке
  `useAppState()` (проверить, что хук его уже тянет; если нет — добавить).
  statsLines в 004 не передаём (сводка статистики — вместе с инструментом
  configure_stats в 006); buildDataSummary это позволяет (`statsLines?`).
- [ ] `npx tsc --noEmit` → exit 0; `npm test` → зелёные.
- [ ] `npm run test:e2e` → зелёные (без ключа `assistAvailable=false` —
  путь бит-в-бит прежний, ни одного await).
- [ ] Commit: `feat(ai): свободные вопросы в чате идут через оркестратор`

### Step 8: Живая проверка (при наличии ключа у оператора)

- [ ] С `GOOGLE_GENERATIVE_AI_API_KEY` в `.env.local`, dev-сервер 3001,
  пресет `mid`/`full` в дев-панели (Cmd-хоткей). В разделе «Кампании»
  спросить в промпт-баре: «какая кампания принесла больше всего?» →
  ответ с реальным именем кампании из стейта. Спросить: «как настроить
  рекламу в Яндекс.Директе?» → ответ «в Афине этого нет» без выдумок.
  Спросить «а сколько у неё бюджет?» (проверка истории) → ответ про ту же
  кампанию.
- [ ] Без ключа — пометить в отчёте «live: not verified (no key)» и
  убедиться, что фраза уходит в тёплый фоллбек как раньше.

### Step 9: Архитектурный док + статус

- [ ] Создать `docs/ai-orchestrator.md` (по-русски): архитектурная схема из
  §2 спеки; четыре слоя промпта; таблица инструментов (пока answer/clarify,
  с пометкой «005: edit_workflow, rebuild_workflow, edit_node_params, undo_last;
  006: configure_stats, navigate, edit_triggers»); контракт
  `assist-contract.ts`; fallback-цепочка; как добавить новый инструмент
  (5 шагов: schema → tool() в route → kind в assistResultSchema → ветка
  клиента → кейсы в evals). Указать, что документ — наследник
  `docs/ai-workflow-integration-spike.md`.
- [ ] Обновить строку 004 в `plans/README.md` (см. шаблон строк 001–003).
- [ ] Финальный прогон: `npx tsc --noEmit` + `npm test` + `npm run test:e2e` → зелёные.
- [ ] Commit: `docs(ai): архитектура оркестратора + статус плана 004`

## Test plan

- Юнит: afina-knowledge (3), assist-contract (4), data-summary (3),
  orchestrator-prompt (2) — новые; существующие без правок зелёные.
- E2E: весь набор зелёный без ключа (фоллбек-путь не изменён).
- Live-проверка шага 8 — при наличии ключа.

## Done criteria

- [ ] `npx tsc --noEmit`, `npm test`, `npm run test:e2e` — exit 0
- [ ] `curl` без ключа: GET → `available:false`, POST → 503 `no-key`
- [ ] `grep -rn "GOOGLE_GENERATIVE_AI_API_KEY" src/` — только в двух route handlers
- [ ] AFINA_KNOWLEDGE: 7 разделов, без плейсхолдеров, в бюджете
- [ ] `docs/ai-orchestrator.md` существует
- [ ] Строка 004 в `plans/README.md` обновлена
- [ ] Контент-ревью знаний оператором запрошено (или получено)

## STOP conditions

- Сигнатура `tool`/`generateText`/`toolChoice` в `ai@6.0.146` не
  восстанавливается из типов пакета за разумное время.
- Gemini Flash через `@ai-sdk/google@3.0.80` не поддерживает function
  calling в установленной связке (ошибка провайдера на tools).
- Интеграция шага 7 требует менять `chat-context.tsx` или реструктурировать
  `use-chat-submit.ts` за пределами фоллбек-бранча.
- Фактический экспорт fact-cube не позволяет получить агрегаты без
  дублирования логики статистики (тогда statsLines выкинуть из 004 и
  зафиксировать в отчёте — НЕ городить параллельный куб).
- Любой шаг подталкивает закоммитить значение ключа.

## Maintenance notes

- `toolChoice: "required"` заставляет модель всегда вызывать инструмент —
  если на живой проверке модель злоупотребляет answer для действий, это
  проблема 005/006 (там появятся действия), не этого плана.
- Ревьюеру: privacy-граница (сводка ≤ 20 кампаний/сигналов, без параметров
  нод), отсутствие await на пути без ключа, история ≤ 8.
- Каталог informational-replies сознательно остаётся вторым эшелоном ПОСЛЕ
  AI (AI отвечает своими словами по знаниям; каталог — офлайн).
