# Plan 007: Экзамен (evals), журнал коридорных тестов, процессные доки, поглощение спайка

> **Executor instructions**: Follow this plan step by step, verify every
> step, STOP conditions обязательны. По завершении обновить строку статуса
> в `plans/README.md`.
>
> **REQUIRED SUB-SKILL**: superpowers:executing-plans (или
> superpowers:subagent-driven-development).
>
> **Drift check (run first)**:
> `git diff --stat c2513c6..HEAD -- src/state/dev-config.ts src/components/dev/dev-panel.tsx src/lib/ai-workflow-client.ts src/app/api/ai/workflow-ops/route.ts package.json`
> Планы 004–006 трогали dev-config только если добавляли флаги (не должны
> были); сверить "Current state" с живым кодом.

## Status

- **Priority**: P1 (без экзамена качество промптов 004–006 неизмеримо)
- **Effort**: M–L (контентная работа: кейсы)
- **Risk**: LOW (ничего не меняет в продуктовых путях, кроме удаления
  поглощённого спайк-эндпоинта в финале)
- **Depends on**: plans/006-ai-stats-navigate-triggers.md (полный набор
  инструментов — иначе экзаменовать нечего)
- **Spec**: спека §10 (экзамен, журнал), §14 (поглощение спайка), §16
  (документы-деливераблы)
- **Planned at**: commit `c2513c6`, 2026-06-11

## Why this matters

Экзамен — это и есть механизм «обучения»: правка знаний/промптов без
прогона кейсов — гадание. Журнал под dev-флагом — единственный канал сбора
реальных фраз пользователей с коридорных тестов (сервер тексты не логирует —
privacy-граница). Плюс финальная уборка: спайк-эндпоинт `/api/ai/workflow-ops`
поглощается оркестратором.

## Current state

- После 004–006: оркестратор `/api/ai/assist` с инструментами answer /
  clarify / edit_workflow / rebuild_workflow / edit_node_params / undo_last /
  configure_stats / navigate / edit_triggers; ответ
  `{ results: AssistResult[] }` (1–2); клиент `fetchAssist` /
  `fetchAssistAvailability` в `src/lib/ai/assist-client.ts`.
- Спайк-эндпоинт: `src/app/api/ai/workflow-ops/route.ts` + клиент
  `src/lib/ai-workflow-client.ts` (`fetchAiStructuralOps`,
  `fetchAiAvailability`). После 005 composer их НЕ зовёт; `fetchAiAvailability`
  ещё импортирует `dev-panel.tsx:17` (строка статуса ключа).
- Dev-флаги: `src/state/dev-config.ts` — `afina.dev.processingMs`,
  `afina.dev.aiParser`; SSR-safe геттеры. Дев-панель:
  `src/components/dev/dev-panel.tsx` — секция «AI-парсер команд»
  (строки 258–281): Switch + строка статуса ключа.
- Сырьё для кейсов: `src/state/structural-commands.test.ts` (фразы regex),
  `src/lib/stats-query-matcher.ts` (10 запросов), `src/lib/
  informational-replies.ts` (ENTRIES: match-формулировки + факты ответов),
  `src/data/scenarios.ts` (36 сценариев), `src/lib/trigger-edit-parser.test.ts`.
- Тесты: vitest юнит (`npm test`), playwright e2e; eval-скрипт в CI НЕ
  живёт (нужен ключ, квота free tier ~15 req/min).
- `package.json` scripts: dev/build/start/lint/test/test:watch/test:ui/
  test:e2e/test:e2e:ui.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit | `npm test` | зелёные |
| E2E | `npm run test:e2e` | зелёные |
| Dev | `npm run dev -- -p 3001` | порт 3001 |
| Eval (с ключом) | `npm run eval` | отчёт со счётом, exit 0 при 100% must-pass |

## Scope

**Create:**
- `evals/cases.mjs` — кейсы экзамена (контент!)
- `evals/README.md` — как писать кейсы, как и когда гонять
- `scripts/run-evals.mjs` — прогонщик
- `docs/ai-corridor-testing.md` — памятка фасилитатору

**Modify:**
- `src/state/dev-config.ts` — флаг `afina.dev.aiLog`
- `src/lib/ai/assist-client.ts` — запись журнала под флагом
- `src/components/dev/dev-panel.tsx` — тумблер журнала + «Выгрузить журнал»
- `package.json` — script `eval`
- `docs/ai-workflow-integration-spike.md` — пометка о поглощении
- `docs/ai-orchestrator.md` — разделы «Экзамен», «Журнал»
- `plans/README.md`

**Delete (финальный шаг, только после verify):**
- `src/app/api/ai/workflow-ops/route.ts`
- `src/lib/ai-workflow-client.ts` (фукнцию статуса ключа в дев-панели
  переключить на `fetchAssistAvailability`)
- `src/lib/ai-workflow-schema.test.ts` НЕ удалять — схема живёт (её
  использует инструмент edit_workflow)

**Out of scope:**
- LLM-судья для мягких проверок (спека §15)
- CI-интеграция экзамена
- prompt-composer / use-chat-submit — логика не меняется (журнал пишет
  assist-client, единая точка)

## Git workflow

Тот же ворктри `.worktrees/plans-001-003`, ветка `feat/plans-001-003`.

## Steps

### Step 1: Dev-флаг журнала

- [ ] В `src/state/dev-config.ts` по образцу `isAiParserEnabled`:

```ts
const DEV_AI_LOG_KEY = "afina.dev.aiLog";
const AI_LOG_ENTRIES_KEY = "afina.dev.aiLog.entries";
const AI_LOG_CAP = 200;

/** Журнал AI-обменов для коридорных тестов. Default OFF — приватность. */
export function isAiLogEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEV_AI_LOG_KEY) === "on";
}

export function setAiLogEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEV_AI_LOG_KEY, enabled ? "on" : "off");
}

export interface AiLogEntry {
  at: string; // ISO
  text: string;
  resultKinds: string[]; // ["stats"] | ["navigate","stats"] | ["fallback"] ...
  outcome: "applied" | "clarify" | "answer" | "fallback";
}

export function appendAiLogEntry(entry: AiLogEntry): void {
  if (typeof window === "undefined" || !isAiLogEnabled()) return;
  const raw = window.localStorage.getItem(AI_LOG_ENTRIES_KEY);
  let entries: AiLogEntry[] = [];
  try {
    entries = raw ? (JSON.parse(raw) as AiLogEntry[]) : [];
  } catch {
    entries = [];
  }
  entries.push(entry);
  if (entries.length > AI_LOG_CAP) entries = entries.slice(-AI_LOG_CAP);
  window.localStorage.setItem(AI_LOG_ENTRIES_KEY, JSON.stringify(entries));
}

export function readAiLogEntries(): AiLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(AI_LOG_ENTRIES_KEY) ?? "[]") as AiLogEntry[];
  } catch {
    return [];
  }
}

export function clearAiLog(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_LOG_ENTRIES_KEY);
}
```

- [ ] Тест (дополнить существующий `dev-config.test.ts`, если есть; иначе
  создать): включён флаг → запись добавляется и читается; выключен →
  appendAiLogEntry — no-op; cap 200 соблюдается (вставить 201 → длина 200).
  jsdom-окружение vitest даёт localStorage.
- [ ] `npm test -- dev-config` зелёный.
- [ ] Commit: `feat(dev): журнал AI-обменов под флагом afina.dev.aiLog`

### Step 2: Запись журнала в assist-client

- [ ] В `src/lib/ai/assist-client.ts` — в `fetchAssist` после получения
  результата (единая точка всех AI-обменов):

```ts
import { appendAiLogEntry } from "@/state/dev-config";

// внутри fetchAssist, перед return parsed.data (и в catch/null-путях):
function outcomeOf(results: AssistResult[]): "applied" | "clarify" | "answer" | "fallback" {
  if (results.some((r) => !["answer", "clarify", "none"].includes(r.kind))) return "applied";
  if (results.some((r) => r.kind === "clarify")) return "clarify";
  if (results.some((r) => r.kind === "answer")) return "answer";
  return "fallback";
}

// успешный путь:
appendAiLogEntry({
  at: new Date().toISOString(),
  text: req.text,
  resultKinds: parsed.data.results.map((r) => r.kind),
  outcome: outcomeOf(parsed.data.results),
});
// null-путь (таймаут/ошибка/невалидный ответ):
appendAiLogEntry({
  at: new Date().toISOString(),
  text: req.text,
  resultKinds: [],
  outcome: "fallback",
});
```

  (структурировать аккуратно — один helper `logExchange(req, results | null)`
  внутри модуля, вызываемый из обоих путей).
- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные.
- [ ] Commit: `feat(dev): assist-client пишет журнал обменов при включённом флаге`

### Step 3: Дев-панель — тумблер и выгрузка

- [ ] В `dev-panel.tsx` в секцию «AI-парсер команд» (после Switch,
  строки ~258–281) добавить блок журнала:

```tsx
// state рядом с aiEnabled:
const [aiLogOn, setAiLogOn] = useState(false);
// в mount-эффекте: setAiLogOn(isAiLogEnabled());

function handleAiLogChange(checked: boolean) {
  setAiLogEnabled(checked);
  setAiLogOn(checked);
}

function downloadAiLog() {
  const entries = readAiLogEntries();
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `afina-ai-log-${new Date().toISOString().slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

  JSX (тот же стиль секций панели):

```tsx
<div className="mt-3 border-t border-[#1f1f1f] pt-3">
  <div className="flex items-center justify-between">
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#888]">
        Журнал AI (коридорный тест)
      </div>
      <div className="text-[11px] text-[#666]">
        {aiLogOn ? "пишется в localStorage" : "выключен"}
      </div>
    </div>
    <Switch checked={aiLogOn} onCheckedChange={handleAiLogChange} aria-label="Переключить журнал AI" />
  </div>
  <div className="mt-2 flex gap-1.5">
    <button type="button" onClick={downloadAiLog}
      className="flex-1 rounded-md border border-[#2a2a2a] bg-[#1e1e1e] px-2 py-1.5 text-[11px] transition-colors hover:bg-[#242424]">
      Выгрузить журнал
    </button>
    <button type="button" onClick={() => clearAiLog()}
      className="rounded-md border border-[#2a2a2a] bg-[#1e1e1e] px-2 py-1.5 text-[11px] transition-colors hover:bg-[#242424]">
      Очистить
    </button>
  </div>
</div>
```

- [ ] Ручная проверка: dev-сервер, хоткей панели, включить журнал, задать
  вопрос в чате, «Выгрузить журнал» → JSON с записью.
- [ ] `npx tsc --noEmit` exit 0; `npm run lint` — нет новых ошибок.
- [ ] Commit: `feat(dev): тумблер и выгрузка журнала AI в дев-панели`

### Step 4: Кейсы экзамена — `evals/cases.mjs` (контентная работа)

- [ ] Создать `evals/cases.mjs`. Формат кейса и стартовый набор (~40 кейсов;
  ниже — обязательный костяк, дополнить до 40 из сырья: фразы из
  `structural-commands.test.ts`, match-формулировки informational-replies,
  10 stats-запросов с перефразировками):

```js
/**
 * Кейсы экзамена оркестратора. Каждый кейс:
 *  - name: уникальное имя
 *  - request: { text, history?, context } — как клиент (см. assist-contract)
 *  - expect: проверки над { results } (см. scripts/run-evals.mjs):
 *      kinds        — точный массив kind'ов (или массив допустимых вариантов)
 *      mustContain  — подстроки, обязанные быть в текстовых полях ответа
 *      mustNotContain — подстроки-запреты
 *      check        — (results) => string | null  — произвольная проверка,
 *                     null = ок, строка = описание провала
 *  - mustPass: true — провал валит exit code (поведенческие гарантии);
 *    false — кейс информационный (счёт качества)
 */

const WORKFLOW_GRAPH = {
  nodes: [
    { id: "signal", label: "Сигнал", nodeType: "signal" },
    { id: "n_sms1", label: "СМС", nodeType: "sms" },
    { id: "n_wait1", label: "Задержка", nodeType: "wait", sublabel: "1 день" },
    { id: "n_email1", label: "Email", nodeType: "email" },
    { id: "n_success", label: "Успех", nodeType: "success" },
    { id: "n_end", label: "Конец", nodeType: "end" },
  ],
  edges: [
    { from: "signal", to: "n_sms1" }, { from: "n_sms1", to: "n_wait1" },
    { from: "n_wait1", to: "n_email1" }, { from: "n_email1", to: "n_success" },
  ],
};

const DATA_SUMMARY = [
  "Кампаний: 2",
  '- кампания "Ипотека-лето" (id c1): статус active, бюджет 50000 ₽',
  '- кампания "Реактивация-база" (id c2): статус paused, бюджет 20000 ₽',
  "Сигналов: 1",
  '- сигнал "Ипотека" (id s1): тип Первая сделка, аудитория 1200, сегменты max 100 / high 300 / mid 500 / low 300',
  "Статистика:",
  "- всего: отправок 5000, кликов 800, конверсий 120",
  "- деньги: доход $3400, расход $1100",
].join("\n");

const workflowCtx = { screen: "workflow", dataSummary: DATA_SUMMARY, graph: WORKFLOW_GRAPH };
const statsCtx = { screen: "section:Статистика", dataSummary: DATA_SUMMARY };

export const cases = [
  // ── Послушность: косвенные формулировки команд графа ──
  {
    name: "удаление-смс-прямое",
    request: { text: "убери смс", history: [], context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (rs) =>
        rs[0].ops.some((o) => o.kind === "remove") ? null : "нет remove-операции",
    },
    mustPass: true,
  },
  {
    name: "удаление-смс-косвенное",
    request: {
      text: "хочу чтобы сообщения не использовались в этой кампании",
      history: [], context: workflowCtx,
    },
    expect: {
      kinds: ["workflow-ops"],
      check: (rs) =>
        rs[0].ops.some((o) => o.kind === "remove") ? null : "нет remove-операции",
    },
    mustPass: true,
  },
  {
    name: "удаление-смс-отрицание",
    request: { text: "смс не надо, лучше пуш", history: [], context: workflowCtx },
    expect: { kinds: ["workflow-ops"] },
    mustPass: false,
  },
  // ── Суверенность: явное пожелание против «вкуса» ──
  {
    name: "суверенность-три-смс-подряд",
    request: { text: "добавь три смс подряд без пауз", history: [], context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (rs) => {
        const adds = rs[0].ops.filter((o) => o.kind === "add");
        if (adds.length !== 3) return `add-операций ${adds.length}, ждали 3`;
        if (adds.some((o) => o.nodeType !== "sms")) return "не все add — sms";
        if (rs[0].ops.some((o) => o.kind === "add" && o.nodeType === "wait"))
          return "модель навязала паузу";
        return null;
      },
    },
    mustPass: true,
  },
  // ── Сборка: размытый запрос → clarify (1 раунд, ≤2 вопроса) ──
  {
    name: "сборка-размытая-уточняет",
    request: { text: "собери прогрев холодной базы", history: [], context: workflowCtx },
    expect: {
      kinds: [["clarify"], ["rebuild"]], // допустимы оба; clarify предпочтителен
      check: (rs) =>
        rs[0].kind === "clarify" && rs[0].questions.length > 2
          ? "больше 2 вопросов"
          : null,
    },
    mustPass: true,
  },
  {
    name: "сборка-после-уточнений-строит",
    request: {
      text: "цель — первая покупка, каналы пуш и почта, неделя, 3 касания",
      history: [
        { role: "user", text: "собери прогрев холодной базы" },
        { role: "assistant", text: "Во что конвертируем и какие каналы доступны?" },
      ],
      context: workflowCtx,
    },
    expect: {
      kinds: ["rebuild"],
      check: (rs) => {
        const spec = rs[0].spec;
        if (!spec.nodes.some((n) => n.nodeType === "success")) return "нет success";
        if (!spec.nodes.some((n) => n.nodeType === "end")) return "нет end";
        if (!spec.assumptions || spec.assumptions.length < 10) return "допущения не проговорены";
        return null;
      },
    },
    mustPass: true,
  },
  // ── Границы: не выдумывать, не отсылать к чужим продуктам ──
  {
    name: "ловушка-яндекс-директ",
    request: { text: "как настроить рекламу в Яндекс.Директе?", history: [], context: statsCtx },
    expect: {
      kinds: ["answer"],
      mustNotContain: ["Директе нажмите", "кабинете Яндекс"],
      mustContain: [], // мягкая: честный отказ проверяется check'ом
      check: (rs) =>
        /нет|не умеет|не подключ|только в афине|пока не/i.test(rs[0].text)
          ? null
          : "нет честного отказа",
    },
    mustPass: true,
  },
  {
    name: "ловушка-выдуманная-кнопка",
    request: { text: "где кнопка экспорта в эксель?", history: [], context: statsCtx },
    expect: {
      kinds: ["answer"],
      check: (rs) => (/нет|не /i.test(rs[0].text) ? null : "выдумал экспорт"),
    },
    mustPass: true,
  },
  // ── Данные: ответ с реальными цифрами ──
  {
    name: "данные-лучшая-кампания",
    request: { text: "какая кампания принесла больше всего?", history: [], context: statsCtx },
    expect: { kinds: ["answer"], mustContain: ["Ипотека-лето"] },
    mustPass: true,
  },
  {
    name: "данные-память-сессии",
    request: {
      text: "а какой у неё бюджет?",
      history: [
        { role: "user", text: "какая кампания принесла больше всего?" },
        { role: "assistant", text: "Лучшая — «Ипотека-лето»." },
      ],
      context: statsCtx,
    },
    expect: { kinds: ["answer"], mustContain: ["50"] },
    mustPass: false,
  },
  // ── Статистика: конфигурация таблицы ──
  {
    name: "статистика-по-каналам-за-май",
    request: { text: "покажи по каналам за май, отсортируй по расходу", history: [], context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (rs) => {
        const p = rs[0].patch;
        if (p.rows !== "channels") return `rows=${p.rows}`;
        if (p.sort?.column !== "expenses") return `sort=${JSON.stringify(p.sort)}`;
        return null;
      },
    },
    mustPass: true,
  },
  // ── Составная просьба ──
  {
    name: "составная-открой-и-разбей",
    request: {
      text: "открой статистику и разбей по креативам",
      history: [],
      context: { screen: "section:Сигналы", dataSummary: DATA_SUMMARY },
    },
    expect: {
      kinds: ["navigate", "stats"],
      check: (rs) =>
        rs[0].target?.kind === "section" && rs[0].target.name === "Статистика"
          ? null
          : "navigate не в Статистику",
    },
    mustPass: false,
  },
  // ── Навигация ──
  {
    name: "навигация-открой-кампанию-по-имени",
    request: { text: "открой кампанию по ипотеке", history: [], context: statsCtx },
    expect: {
      kinds: ["navigate"],
      check: (rs) =>
        rs[0].target?.kind === "campaign-workflow" && rs[0].target.campaignId === "c1"
          ? null
          : "не c1",
    },
    mustPass: true,
  },
  // ── Честность: бессмыслица → не делать вид ──
  {
    name: "честность-бессмыслица",
    request: { text: "фиолетовый трактор в небе", history: [], context: workflowCtx },
    expect: {
      kinds: [["answer"], ["clarify"]],
      check: (rs) =>
        rs.some((r) => ["workflow-ops", "rebuild"].includes(r.kind))
          ? "молча сделал действие на бессмыслицу"
          : null,
    },
    mustPass: true,
  },
  // ...дополнить до ~40: перефразировки add/replace из structural-commands.test.ts,
  // 10 stats-запросов из stats-query-matcher (по 1–2 перефразировки),
  // 5–6 вопросов из informational-replies (проверка mustContain по фактам),
  // триггеры: "исключи sberbank.ru и добавь cian.ru" (context с activeTrigger).
];
```

  Указание «дополнить до ~40» — контентная работа по перечисленным
  источникам, каждый добавленный кейс обязан иметь expect-проверки (не
  только kinds).
- [ ] Commit: `feat(evals): стартовый набор кейсов экзамена оркестратора`

### Step 5: Прогонщик — `scripts/run-evals.mjs`

- [ ] Создать `scripts/run-evals.mjs`:

```js
#!/usr/bin/env node
/**
 * Экзамен оркестратора: гонит evals/cases.mjs против /api/ai/assist.
 * Требует: dev-сервер с ключом (npm run dev -- -p 3001) или BASE_URL.
 * Free tier ~15 req/min → пауза 4.5с между кейсами; 40 кейсов ≈ 3–4 мин.
 * Exit 0 — все mustPass прошли; exit 1 — есть провалы mustPass.
 */
import { cases } from "../evals/cases.mjs";

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3001";
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 4500);
const only = process.argv[2]; // npm run eval -- <подстрока имени>

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function textFields(results) {
  return results
    .flatMap((r) => [r.text, r.confirmation, ...(r.questions ?? []), r.spec?.assumptions])
    .filter(Boolean)
    .join(" ");
}

function checkCase(c, results) {
  const failures = [];
  if (c.expect.kinds) {
    const got = results.map((r) => r.kind);
    const variants = Array.isArray(c.expect.kinds[0]) ? c.expect.kinds : [c.expect.kinds];
    if (!variants.some((v) => JSON.stringify(v) === JSON.stringify(got))) {
      failures.push(`kinds: ждали ${JSON.stringify(variants)}, получили ${JSON.stringify(got)}`);
    }
  }
  const text = textFields(results);
  for (const s of c.expect.mustContain ?? []) {
    if (!text.includes(s)) failures.push(`нет подстроки «${s}»`);
  }
  for (const s of c.expect.mustNotContain ?? []) {
    if (text.includes(s)) failures.push(`запрещённая подстрока «${s}»`);
  }
  if (c.expect.check) {
    const r = c.expect.check(results);
    if (r) failures.push(r);
  }
  return failures;
}

const probe = await fetch(`${BASE_URL}/api/ai/assist`).then((r) => r.json()).catch(() => null);
if (!probe?.available) {
  console.error(`Нет ключа на ${BASE_URL} — экзамен требует GOOGLE_GENERATIVE_AI_API_KEY в .env.local`);
  process.exit(2);
}

let passed = 0, failed = 0, mustPassFailed = 0;
const selected = only ? cases.filter((c) => c.name.includes(only)) : cases;
for (const [i, c] of selected.entries()) {
  const res = await fetch(`${BASE_URL}/api/ai/assist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ history: [], ...c.request }),
  }).catch(() => null);
  const body = res?.ok ? await res.json() : null;
  const failures = body?.results ? checkCase(c, body.results) : [`HTTP ${res?.status ?? "network error"}`];
  if (failures.length === 0) {
    passed++;
    console.log(`✓ ${c.name}`);
  } else {
    failed++;
    if (c.mustPass) mustPassFailed++;
    console.log(`✗ ${c.name}${c.mustPass ? " [MUST]" : ""}`);
    for (const f of failures) console.log(`    ${f}`);
  }
  if (i < selected.length - 1) await sleep(DELAY_MS);
}

console.log(`\n${passed}/${selected.length} прошло; провалов must-pass: ${mustPassFailed}`);
process.exit(mustPassFailed > 0 ? 1 : 0);
```

- [ ] В `package.json` scripts добавить: `"eval": "node scripts/run-evals.mjs"`.
- [ ] Проверка без ключа: `npm run eval` → exit 2 с понятным сообщением.
- [ ] Commit: `feat(evals): прогонщик экзамена с rate-limit паузами`

### Step 6: Прогон экзамена и итерация промптов (при наличии ключа)

- [ ] Dev-сервер 3001 с ключом → `npm run eval`. Зафиксировать стартовый
  счёт в отчёте.
- [ ] Для каждого провала must-pass: определить слой (знания / роль /
  описание инструмента / описание поля схемы) → поправить → перегнать
  ТОЛЬКО упавший кейс (`npm run eval -- <имя>`) → полный прогон в конце.
  До 5 итераций; если must-pass не сходится за 5 — STOP condition.
- [ ] Цель: 100% must-pass; информационные кейсы — зафиксировать счёт
  (целевых цифр нет, это базовая линия для следующих итераций).
- [ ] Без ключа у исполнителя: пометить «eval: not run (no key)» — шаг
  обязателен к прогону оператором до коридорного теста (записать в
  README evals).
- [ ] Commit (если были правки промптов): `fix(ai): правки знаний/промптов по итогам экзамена`

### Step 7: Документы — README evals и памятка коридорного теста

- [ ] Создать `evals/README.md`: формат кейса (поля, mustPass-семантика);
  как запускать (dev-сервер с ключом, `npm run eval`, фильтр по имени,
  EVAL_BASE_URL/EVAL_DELAY_MS); **когда запускать** (5 моментов из §10
  спеки: разработка AI-слоя, перед коммитом правок AI-файлов, перед демо,
  после коридорного теста, при смене модели); как добавлять кейсы из
  журнала коридорного теста; почему НЕ в CI (ключ, квота,
  недетерминированность).
- [ ] Создать `docs/ai-corridor-testing.md` — памятка фасилитатору
  (по-русски): до сессии — включить журнал в дев-панели (хоткей панели,
  тумблер «Журнал AI»), проверить статус ключа; во время — не подсказывать
  формулировки; после — «Выгрузить журнал», очистить, превратить
  споткнувшиеся фразы в кейсы (формат — ссылка на evals/README.md,
  outcome=fallback и неверные applied — первые кандидаты).
- [ ] Обновить `docs/ai-orchestrator.md`: разделы «Экзамен» (ссылка на
  evals/README) и «Журнал» (privacy: только localStorage браузера, default
  off, cap 200).
- [ ] Commit: `docs(ai): README экзамена и памятка коридорного теста`

### Step 8: Поглощение спайк-эндпоинта

- [ ] Проверить отсутствие потребителей:
  `grep -rn "fetchAiStructuralOps\|workflow-ops" src/ --include='*.ts' --include='*.tsx'`
  → ожидаемо: только `ai-workflow-client.ts` сам и `dev-panel.tsx`
  (fetchAiAvailability).
- [ ] В `dev-panel.tsx` заменить `import { fetchAiAvailability } from
  "@/lib/ai-workflow-client"` на `import { fetchAssistAvailability } from
  "@/lib/ai/assist-client"` и вызов соответственно.
- [ ] Удалить `src/app/api/ai/workflow-ops/route.ts` и
  `src/lib/ai-workflow-client.ts`. `src/lib/ai-workflow-schema.ts` и его
  тест ОСТАЮТСЯ (схему использует контракт оркестратора).
- [ ] В `docs/ai-workflow-integration-spike.md` добавить вверху:

```markdown
> **Статус (2026-06-11+): поглощён оркестратором.** Эндпоинт
> `/api/ai/workflow-ops` удалён; актуальная архитектура —
> `docs/ai-orchestrator.md`. Документ сохранён как история решения.
```

- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные; `npm run test:e2e`
  зелёные; `grep -rn "workflow-ops" src/` → пусто.
- [ ] Commit: `refactor(ai): спайк-эндпоинт поглощён оркестратором`

### Step 9: Статус серии

- [ ] Обновить строку 007 в `plans/README.md`; перепроверить строки 004–006
  (статусы DONE с коммитами, если исполнялись этой же сессией).
- [ ] Финальный прогон: `npx tsc --noEmit`, `npm test`, `npm run test:e2e`;
  `npm run eval` при ключе.
- [ ] Commit: `docs(plans): статусы серии 004–007`

## Test plan

- Юнит: dev-config (журнал: флаг, cap, no-op без флага).
- Экзамен: 100% must-pass при ключе (или явная пометка «не прогнан»).
- E2E зелёные (журнал off по умолчанию — ничего не меняет).
- Ручная проверка дев-панели (шаг 3) и выгрузки JSON.

## Done criteria

- [ ] `npx tsc --noEmit`, `npm test`, `npm run test:e2e` — exit 0
- [ ] `npm run eval` без ключа → exit 2 с сообщением; с ключом → отчёт
- [ ] evals/cases.mjs: ≥35 кейсов, у каждого есть проверки кроме kinds
- [ ] Журнал: default off; включён → пишет; выгрузка отдаёт JSON
- [ ] `grep -rn "workflow-ops" src/` → пусто
- [ ] Все 4 документа существуют: evals/README.md,
  docs/ai-corridor-testing.md, обновлённые ai-orchestrator.md и spike-док
- [ ] Строки 004–007 в `plans/README.md` актуальны

## STOP conditions

- Must-pass кейсы не сходятся к 100% за 5 итераций правок промптов —
  остановиться, приложить таблицу провалов (вероятно, нужен пересмотр
  описаний инструментов или модель сильнее — решение оператора).
- После удаления спайк-эндпоинта падают существующие тесты, которых grep
  не показал как потребителей.
- Журнал требует менять privacy-границу сервера (логировать тексты на
  сервере) — это запрещено спекой §13.
- Любой шаг подталкивает закоммитить ключ.

## Maintenance notes

- Экзамен вероятностный: единичный провал не-must-pass кейса — не регрессия,
  смотреть тренд. Must-pass — поведенческие гарантии (§7 спеки), там
  провал = баг промпта.
- Новые кейсы после каждого коридорного теста — из журнала; outcome
  «fallback» и неверные «applied» — первые кандидаты.
- При смене модели (`AFINA_AI_MODEL`) — полный прогон до выкатки.
