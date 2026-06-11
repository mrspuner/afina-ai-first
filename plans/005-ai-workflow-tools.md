# Plan 005: Инструменты графа — edit_workflow с контекстом, rebuild, параметры ноды, откат

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> On any STOP condition — stop and report. When done, update the status row
> in `plans/README.md`.
>
> **REQUIRED SUB-SKILL**: superpowers:executing-plans (или
> superpowers:subagent-driven-development).
>
> **Drift check (run first)**:
> `git diff --stat c2513c6..HEAD -- src/sections/shell/prompt-composer.tsx src/sections/campaigns/workflow-view.tsx src/sections/campaigns/workflow-graph-cache.ts src/state/app-state.ts src/state/structural-commands.ts src/state/workflow-validation.ts src/state/select-prompt-suggestions.ts src/lib/ai-workflow-schema.ts`
> План 004 эти файлы не трогает (кроме как через новые файлы `src/lib/ai/*`);
> другие изменения — сверить "Current state" с живым кодом, mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED-HIGH (rebuild — первый инструмент, создающий граф целиком;
  смягчается валидатором и откатом)
- **Depends on**: plans/004-ai-orchestrator-answer.md (оркестратор и контракт)
- **Spec**: спека §4 (edit_workflow, rebuild_workflow, edit_node_params),
  §6 (правила трёх уровней, валидатор), §7 (поведение), §8 (откат)
- **Planned at**: commit `c2513c6`, 2026-06-11

## Why this matters

Ядро запроса оператора: «AI реально перестраивает граф». Спайк 002 умеет
только добавлять ноды вслепую (`nodes: []`). Этот план даёт модели глаза
(сводка графа в контексте), руки (`edit_workflow` по живому графу,
`rebuild_workflow` с нуля, `edit_node_params` для выбранной ноды) и
страховку (валидатор механики + откат одним шагом).

## Current state

- Граф живёт в локальном useState `workflow-view.tsx` (`GraphState =
  { nodes, edges }`, строки 29–32) и **дублируется в module-scope кэш**
  `src/sections/campaigns/workflow-graph-cache.ts`:
  `getCachedGraph(campaignId)` / `setCachedGraph(campaignId, graph)` —
  автосохранение эффектом при каждом изменении графа. Это даёт
  prompt-composer'у доступ к нодам БЕЗ новой сантехники: на экране воркфлоу
  `view.campaign.id` известен (View: `{ kind: "workflow"; campaign: { id;
  name }; launched }`).
- Очереди команд в app-state (строки 220–229): пары submit/handled для
  `workflow_command`, `workflow_node_command`, `workflow_node_field_set`,
  `workflow_structural_commands`. Воркфлоу-вью консьюмит их эффектами через
  `runCycle` c `apply(prev)` (фикс плана 001) — цикл «Думаю…» 3–5с
  (`opCount === 1 ? 3000 : opCount <= 3 ? 4000 : 5000`), reveal 600мс,
  flash 1500мс.
- `applyOps(graph, ops): { graph; applied; skipped }`
  (`structural-commands.ts:741`) — чистая. `StructuralOp`/`Placement` —
  строки 9–28. Зеркальные zod-схемы — `src/lib/ai-workflow-schema.ts`
  (`structuralOpSchema`, `placementSchema`, `nodeTypeSchema` — enum из 18
  типов, включая legacy).
- `validateWorkflow(graph, signalBound)` (`workflow-validation.ts:13`) —
  проверяет no-signal / needs-attention / no-success-path (BFS от первой
  ноды). Вызывается из `workflow-section.tsx` для гейта запуска.
- Шаблоны: `TEMPLATE_BY_TYPE` (`workflow-templates.ts:254`) — 6 эталонных
  графов с params; хелпер `n(id, label, nodeType, x, y, sublabel, extras,
  params)` и `e(source, target, label?)`, STEP=210.
- `patchNodeParams(nodes, id, paramsPatch)` (`types/workflow.ts:138`);
  `NodeParams` — discriminated union по `kind` (sms/email/push/ivr/wait/
  condition/split/merge/signal/success/end/storefront/landing);
  `needsAttention?: boolean` в `WorkflowNodeData`.
- Свободный текст на воркфлоу: `prompt-composer.tsx` строки 340–369 —
  authentication-гейт `isAiParserEnabled() && aiAvailable`, AI-ветка зовёт
  `fetchAiStructuralOps(rawText, [])`, фоллбек `workflow_command_submit`.
- Подсказки: `selectPromptSuggestions(state, ctx)` →
  `SuggestionResolution`; `SuggestionItem { id; label; action; variant? }`,
  `SuggestionAction` включает `{ kind: "dispatch"; action: AppAction }`.
- Выбранная нода: `state.selectedWorkflowNode: { id; label; nodeType? } | null`.
- ID нод: `n_${nanoId()}` (8 случайных base36 символов,
  `structural-commands.ts:353`).
- После 004 существуют: `assist-contract.ts` (request/result схемы,
  `context.screen`, `context.dataSummary`), route `/api/ai/assist` c tools
  answer/clarify и `let result: AssistResult`, `assist-client.ts`
  (`fetchAssist`, таймаут 6с), `buildSystemPrompt(context)`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit | `npm test` | зелёные |
| Dev server | `npm run dev -- -p 3001` | порт 3001 |
| E2E | `npm run test:e2e` | зелёные (нет ключа → старый путь) |

## Scope

**Create:**
- `src/lib/ai/graph-summary.ts` + `.test.ts` — сводка графа для контекста
- `src/lib/ai/rebuild-schema.ts` + `.test.ts` — zod-схема rebuild + билдер нод
- `src/state/ai-graph-validation.ts` + `.test.ts` — расширенный валидатор

**Modify:**
- `src/lib/ai/assist-contract.ts` — контекст: `graph?`, `selectedNode?`,
  `undoAvailable?`; result: новые kind'ы
- `src/app/api/ai/assist/route.ts` — инструменты edit_workflow /
  rebuild_workflow / edit_node_params / undo_last (условная регистрация)
- `src/state/app-state.ts` — действия rebuild/undo + флаг `aiUndoAvailable`
  (в PARALLEL-WORKTREE INSERTION POINT)
- `src/sections/campaigns/workflow-view.tsx` — эффекты rebuild/undo, снапшот
- `src/sections/shell/prompt-composer.tsx` — AI-ветка воркфлоу через fetchAssist
- `src/state/select-prompt-suggestions.ts` (или соответствующий резолвер
  scope воркфлоу в suggestion-registry) — подсказка «↩ Откатить»
- `plans/README.md`

**Out of scope:**
- `/api/ai/workflow-ops` и `fetchAiStructuralOps` — НЕ удалять (план 007);
  composer просто перестаёт их звать
- `applyOps`, `structural-commands.ts` — без правок
- configure_stats / navigate / edit_triggers — план 006
- Параметры нод в rebuild сверх дефолтов шаблонного уровня

## Git workflow

Тот же ворктри `.worktrees/plans-001-003`, ветка `feat/plans-001-003`,
коммит после каждого шага.

## Steps

### Step 1: Сводка графа — `graph-summary.ts`

- [ ] Создать `src/lib/ai/graph-summary.ts`:

```ts
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface GraphNodeSummary {
  id: string;
  label: string;
  nodeType: string;
  sublabel?: string;
}

/**
 * Компактная сводка графа для контекста оркестратора: id, подпись, тип,
 * сабтлейбл (там длительность паузы / триггер условия). Параметры нод
 * НЕ уходят — privacy-граница и токен-бюджет.
 */
export function summarizeGraph(graph: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}): { nodes: GraphNodeSummary[]; edges: Array<{ from: string; to: string }> } {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      nodeType: n.data.nodeType,
      ...(n.data.sublabel ? { sublabel: n.data.sublabel } : {}),
    })),
    edges: graph.edges.map((e) => ({ from: e.source, to: e.target })),
  };
}
```

- [ ] Тест `src/lib/ai/graph-summary.test.ts` — собрать минимальный граф из
  двух нод (использовать фабрику из `workflow-templates.ts` нельзя — она не
  экспортирует `n`; собрать литералами `{ id, type: "workflowNode",
  position: {x:0,y:0}, data: { label, nodeType } }`), проверить: id/label/
  nodeType присутствуют, `data.params` НЕ попадает в вывод
  (`expect(JSON.stringify(summary)).not.toContain("params")`).
- [ ] `npm test -- graph-summary` зелёный; `npx tsc --noEmit` exit 0.
- [ ] Commit: `feat(ai): сводка графа воркфлоу для контекста оркестратора`

### Step 2: Контракт — расширение контекста и результата

- [ ] В `src/lib/ai/assist-contract.ts` расширить контекст:

```ts
export const graphNodeSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
  nodeType: z.string(),
  sublabel: z.string().optional(),
});

export const assistContextSchema = z.object({
  screen: z.string(),
  dataSummary: z.string(),
  graph: z
    .object({
      nodes: z.array(graphNodeSummarySchema),
      edges: z.array(z.object({ from: z.string(), to: z.string() })),
    })
    .optional(),
  selectedNode: graphNodeSummarySchema.optional(),
  undoAvailable: z.boolean().optional(),
});
```

  И результат — добавить в `assistResultSchema` варианты (импортировав
  `structuralOpSchema` из `@/lib/ai-workflow-schema` и `rebuildGraphSchema`
  из `./rebuild-schema`, создаваемой шагом 3 — поэтому НА ЭТОМ шаге добавить
  только первые два, rebuild добавить в шаге 3):

```ts
  z.object({ kind: z.literal("workflow-ops"), ops: z.array(structuralOpSchema) }),
  z.object({
    kind: z.literal("node-params"),
    nodeId: z.string(),
    patch: z.record(z.string(), z.unknown()), // Partial<NodeParams>; точную форму гарантирует сервер
    confirmation: z.string(),
  }),
  z.object({ kind: z.literal("undo") }),
```

- [ ] Дополнить `assist-contract.test.ts`: валидный `workflow-ops` c одним
  `{ kind: "add", nodeType: "push", placement: { mode: "auto" } }` проходит;
  `node-params` без `nodeId` отклоняется; контекст с graph и selectedNode
  проходит.
- [ ] `npm test -- assist-contract` зелёный; `npx tsc --noEmit` exit 0.
- [ ] Commit: `feat(ai): контракт — граф в контексте, ops/params/undo в результате`

### Step 3: Rebuild — схема и билдер нод

- [ ] Создать `src/lib/ai/rebuild-schema.ts`. Схема намеренно проще полного
  WorkflowNode — модель отдаёт «спецификацию», билдер превращает её в
  валидные ноды с дефолтными params (уровень шаблонов) и раскладкой:

```ts
import { z } from "zod";
import type { NodeParams, WorkflowNode, WorkflowEdge } from "@/types/workflow";

/** Типы, доступные модели при пересборке. Без legacy и без signal —
 *  сигнальную ноду билдер всегда ставит сам первой. */
export const rebuildNodeTypeSchema = z.enum([
  "sms", "email", "push", "ivr", "wait", "condition", "split", "merge",
  "storefront", "landing", "success", "end",
]);

export const rebuildNodeSchema = z.object({
  /** Слаг в пределах ответа (модель ссылается на него в edges). */
  key: z.string().min(1),
  nodeType: rebuildNodeTypeSchema,
  label: z.string().min(1),
  sublabel: z.string().optional(),
});

export const rebuildGraphSchema = z.object({
  nodes: z.array(rebuildNodeSchema).min(2).max(20),
  edges: z
    .array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() }))
    .min(1),
  /** Допущения, которые модель проговаривает пользователю (§7 спеки). */
  assumptions: z.string(),
});
export type RebuildGraphSpec = z.infer<typeof rebuildGraphSchema>;

const STEP = 210;

function defaultParams(nodeType: z.infer<typeof rebuildNodeTypeSchema>): NodeParams {
  switch (nodeType) {
    case "sms": return { kind: "sms", text: "Текст сообщения", alphaName: "BRAND", scheduledAt: "immediate" };
    case "email": return { kind: "email", subject: "Тема письма", body: "Текст письма", sender: "noreply@brand.com" };
    case "push": return { kind: "push", title: "Заголовок", body: "Текст уведомления" };
    case "ivr": return { kind: "ivr", scenario: "Сценарий звонка", voiceType: "neutral" };
    case "wait": return { kind: "wait", mode: "duration", durationHours: 24 };
    case "condition": return { kind: "condition", trigger: "opened" };
    case "split": return { kind: "split", by: "equal", branches: 2 };
    case "merge": return { kind: "merge" };
    case "storefront": return { kind: "storefront", offers: [] };
    case "landing": return { kind: "landing", cta: "Перейти", offerTitle: "Предложение" };
    case "success": return { kind: "success", goal: "Конверсия" };
    case "end": return { kind: "end", reason: "Без конверсии" };
  }
}

/**
 * Спецификация модели → полный граф. Сигнальная нода добавляется первой
 * (key "signal" зарезервирован); ноды без указанных моделью текстов несут
 * дефолтные params и НЕ помечаются needsAttention — дефолты осмысленные
 * (уровень шаблонов), пользователь дозаполняет по желанию.
 */
export function buildGraphFromSpec(
  spec: RebuildGraphSpec,
  signal: { label: string; sublabel?: string }
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [
    {
      id: "signal",
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        label: signal.label, nodeType: "signal", sublabel: signal.sublabel,
        params: { kind: "signal", fileName: "", count: 0, segments: { max: 0, high: 0, mid: 0, low: 0 } },
      },
    },
    ...spec.nodes.map((n, i) => ({
      id: `n_${n.key}`,
      type: "workflowNode" as const,
      position: { x: STEP * (i + 1), y: n.nodeType === "end" ? 120 : 0 },
      data: {
        label: n.label,
        nodeType: n.nodeType,
        sublabel: n.sublabel,
        ...(n.nodeType === "success" ? { isSuccess: true } : {}),
        params: defaultParams(n.nodeType),
      },
    })),
  ];
  const keyToId = (k: string) => (k === "signal" ? "signal" : `n_${k}`);
  const edges: WorkflowEdge[] = spec.edges.map((e) => ({
    id: `e_${e.from}_${e.to}`,
    source: keyToId(e.from),
    target: keyToId(e.to),
    type: "default",
    ...(e.label ? { label: e.label } : {}),
  }));
  return { nodes, edges };
}
```

  Стили рёбер (EDGE_STYLE и пр. из workflow-templates) НЕ копировать — при
  применении вью рендерит дефолтные; если на живой проверке рёбра выглядят
  иначе остальных, перенести `EDGE_STYLE` в общий модуль и применить (мелкая
  правка, зафиксировать в отчёте).
- [ ] В `assist-contract.ts` добавить в `assistResultSchema`:

```ts
  z.object({ kind: z.literal("rebuild"), spec: rebuildGraphSchema }),
```

- [ ] Тест `src/lib/ai/rebuild-schema.test.ts`:
  - валидная спека (push → wait → email → success + end) парсится;
  - `nodeType: "signal"` в nodes отклоняется (нет в enum);
  - `buildGraphFromSpec`: первая нода — signal; у success
    `isSuccess: true`; ребро `{ from: "signal", to: "p1" }` превращается в
    `source: "signal", target: "n_p1"`; у каждой ноды есть `params`.
- [ ] `npm test -- rebuild-schema` зелёный; `npx tsc --noEmit` exit 0.
- [ ] Commit: `feat(ai): схема rebuild и билдер графа из спецификации модели`

### Step 4: Валидатор механики — `ai-graph-validation.ts`

- [ ] Создать `src/state/ai-graph-validation.ts`. Проверяет ТОЛЬКО механику
  (§6 спеки — никакого маркетингового вкуса):

```ts
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export type AiGraphError =
  | "no-signal-entry"      // нет ноды типа signal
  | "no-success-terminal"  // нет ноды success
  | "no-end-terminal"      // нет ноды end
  | "dangling-edge"        // ребро ссылается на несуществующую ноду
  | "unreachable-node"     // нода недостижима из signal
  | "condition-degree";    // у condition не ровно 2 исходящих ребра

export function validateAiGraph(graph: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}): { ok: boolean; errors: AiGraphError[] } {
  const errors: AiGraphError[] = [];
  const ids = new Set(graph.nodes.map((n) => n.id));
  const byType = (t: string) => graph.nodes.filter((n) => n.data.nodeType === t);

  const signals = byType("signal");
  if (signals.length === 0) errors.push("no-signal-entry");
  if (byType("success").length === 0) errors.push("no-success-terminal");
  if (byType("end").length === 0) errors.push("no-end-terminal");

  for (const e of graph.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      errors.push("dangling-edge");
      break;
    }
  }

  if (signals.length > 0 && !errors.includes("dangling-edge")) {
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]);
    }
    const seen = new Set<string>();
    const queue = [signals[0].id];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...(adj.get(id) ?? []));
    }
    if (graph.nodes.some((n) => !seen.has(n.id))) errors.push("unreachable-node");

    for (const c of byType("condition")) {
      if ((adj.get(c.id) ?? []).length !== 2) {
        errors.push("condition-degree");
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
```

- [ ] Тест `src/state/ai-graph-validation.test.ts`: эталонный граф из
  `buildGraphFromSpec` (взять спеку из теста шага 3) — `ok: true`; убрать
  end-ноду → `no-end-terminal`; ребро в несуществующий id →
  `dangling-edge`; нода без входящих рёбер → `unreachable-node`; condition
  с одним исходящим → `condition-degree`.
- [ ] Прогнать валидатор на всех 6 шаблонах `TEMPLATE_BY_TYPE` в тесте —
  все `ok: true` (страховка, что механика не строже реальных графов;
  ВАЖНО: если какой-то шаблон падает — это новое знание, валидатор
  ослабить под факт, а не чинить шаблон).
- [ ] `npm test -- ai-graph-validation` зелёный.
- [ ] Commit: `feat(workflow): валидатор механики для AI-собранных графов`

### Step 5: Инструменты в route handler

- [ ] В `src/app/api/ai/assist/route.ts` — после блока tools answer/clarify
  добавить условную регистрацию (инструменты видны модели только на
  редактируемом воркфлоу — фильтр по экрану из §2 спеки):

```ts
import { structuralOpSchema } from "@/lib/ai-workflow-schema";
import { rebuildGraphSchema } from "@/lib/ai/rebuild-schema";

// внутри POST, после базовых tools:
const onWorkflow = context.screen === "workflow" && context.graph;
if (onWorkflow) {
  Object.assign(tools, {
    edit_workflow: tool({
      description:
        "Изменить текущий граф воркфлоу операциями add/remove/replace. " +
        "ref — точный label ноды из контекста графа. Используй для точечных правок.",
      inputSchema: z.object({ ops: z.array(structuralOpSchema).min(1) }),
      execute: ({ ops }) => {
        result = { kind: "workflow-ops", ops };
        return "ok";
      },
    }),
    rebuild_workflow: tool({
      description:
        "Пересобрать граф ЦЕЛИКОМ по описанию пользователя. Используй только " +
        "когда просят собрать заново/с нуля. Форма: вход-сигнал уже есть, ты " +
        "описываешь середину (каналы, паузы, условия) и два исхода: success и end. " +
        "В assumptions перечисли принятые допущения одним-двумя предложениями.",
      inputSchema: rebuildGraphSchema,
      execute: (spec) => {
        result = { kind: "rebuild", spec };
        return "ok";
      },
    }),
  });
  if (context.selectedNode) {
    Object.assign(tools, {
      edit_node_params: tool({
        description:
          `Изменить параметры выбранной ноды «${context.selectedNode.label}» ` +
          `(тип ${context.selectedNode.nodeType}). patch — только изменяемые поля ` +
          "параметров этого типа ноды; confirmation — короткая фраза, что поменял.",
        inputSchema: z.object({
          patch: z.record(z.string(), z.unknown()),
          confirmation: z.string(),
        }),
        execute: ({ patch, confirmation }) => {
          result = {
            kind: "node-params",
            nodeId: context.selectedNode!.id,
            patch,
            confirmation,
          };
          return "ok";
        },
      }),
    });
  }
  if (context.undoAvailable) {
    Object.assign(tools, {
      undo_last: tool({
        description: "Откатить последнее AI-изменение графа («откати», «верни как было»).",
        inputSchema: z.object({}),
        execute: () => {
          result = { kind: "undo" };
          return "ok";
        },
      }),
    });
  }
}
```

  Чтобы `Object.assign` работал, базовый объект tools объявить как
  `const tools: Record<string, ReturnType<typeof tool>> = { answer: ..., clarify: ... }`
  (точный тип сверить с `ai@6`; если generic-типизация сопротивляется —
  собрать объект целиком через spread-условия:
  `const tools = { answer, clarify, ...(onWorkflow ? { edit_workflow, rebuild_workflow } : {}) }`).
- [ ] В системный промпт (через `buildSystemPrompt`) контекст графа уже
  попадает полем `context.dataSummary`? Нет — граф отдельным полем. Добавить
  в `buildSystemPrompt` (orchestrator-prompt.ts) сериализацию графа:

```ts
    ...(context.graph
      ? [
          "Текущий граф воркфлоу (ноды и связи):",
          context.graph.nodes
            .map((n) => `- [${n.id}] "${n.label}" (${n.nodeType}${n.sublabel ? `, ${n.sublabel}` : ""})`)
            .join("\n"),
          context.graph.edges.map((e) => `${e.from} → ${e.to}`).join("; "),
        ]
      : []),
    ...(context.selectedNode
      ? [`Выбрана нода: [${context.selectedNode.id}] "${context.selectedNode.label}" (${context.selectedNode.nodeType})`]
      : []),
```

  и тест в `orchestrator-prompt.test.ts`: граф с одной нодой → промпт
  содержит её label и стрелку рёбер.
- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные.
- [ ] Commit: `feat(ai): инструменты графа в оркестраторе (ops/rebuild/params/undo)`

### Step 6: App-state — rebuild и undo (PARALLEL-WORKTREE INSERTION POINT)

- [ ] В `src/state/app-state.ts` добавить в union действий (в insertion
  point, строка ~274):

```ts
| { type: "workflow_rebuild_submit"; nodes: WorkflowNode[]; edges: WorkflowEdge[]; assumptions: string }
| { type: "workflow_rebuild_handled" }
| { type: "workflow_ai_undo_request" }
| { type: "workflow_ai_undo_handled" }
| { type: "workflow_ai_undo_availability"; available: boolean }
```

  (импорты WorkflowNode/WorkflowEdge в файле уже есть — проверить, иначе
  добавить из `@/types/workflow`).
- [ ] Поля стейта (рядом с `workflowStructuralCommands`):

```ts
workflowRebuild: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; assumptions: string } | null,
workflowAiUndoRequested: boolean,
aiUndoAvailable: boolean,
```

  (инициализация: `null`, `false`, `false` — в initial state).
- [ ] Кейсы редьюсера (в конец appReducer, по конвенции insertion point):

```ts
case "workflow_rebuild_submit":
  return { ...state, workflowRebuild: { nodes: action.nodes, edges: action.edges, assumptions: action.assumptions } };
case "workflow_rebuild_handled":
  return { ...state, workflowRebuild: null };
case "workflow_ai_undo_request":
  return { ...state, workflowAiUndoRequested: true };
case "workflow_ai_undo_handled":
  return { ...state, workflowAiUndoRequested: false };
case "workflow_ai_undo_availability":
  return { ...state, aiUndoAvailable: action.available };
```

- [ ] `npx tsc --noEmit` exit 0 (строгий switch скомпилируется только с
  полными кейсами); `npm test` зелёные.
- [ ] Commit: `feat(state): очереди rebuild и undo для AI-правок графа`

### Step 7: Workflow-view — применение rebuild, снапшот, undo

- [ ] В `workflow-view.tsx` добавить ref снапшота рядом с прочими ref'ами:

```ts
// Снапшот графа до последней AI-операции — для отката одним шагом (§8 спеки).
const aiSnapshotRef = useRef<GraphState | null>(null);
```

- [ ] В обработчиках структурных команд и rebuild ПЕРЕД применением внутри
  `apply(prev)` сохранять снапшот и публиковать доступность отката:

```ts
aiSnapshotRef.current = prev; // prev — живой граф из apply(prev)
```

  и после применения (в месте, где диспатчится `*_handled`):

```ts
dispatch({ type: "workflow_ai_undo_availability", available: true });
```

  Структурные команды сегодня приходят и от regex-пути — снапшот для них
  тоже корректен (откат работает для любой команд-правки графа; это шире
  спеки в безопасную сторону).
- [ ] Эффект rebuild — по образцу эффекта структурных команд (тот же
  `runCycle`, длительность как для `opCount >= 4` → 5000мс):

```ts
const pendingRebuild = state.workflowRebuild;
useEffect(() => {
  if (!pendingRebuild) return;
  dispatch({ type: "workflow_rebuild_handled" });
  runCycle({
    durationMs: 5000,
    pendingReplyText: "Пересобираю сценарий…",
    apply: (prev) => {
      aiSnapshotRef.current = prev;
      return {
        graph: { nodes: pendingRebuild.nodes, edges: pendingRebuild.edges },
        changedIds: pendingRebuild.nodes.map((n) => n.id),
        finalReply: `Собрал заново. ${pendingRebuild.assumptions}`,
      };
    },
  });
  dispatch({ type: "workflow_ai_undo_availability", available: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pendingRebuild]);
```

  Сигнатуру `runCycle` сверить с фактической (план 001 её формировал);
  если `finalReply`/`pendingReplyText` передаются иначе (через chat.append
  снаружи) — повторить точный паттерн соседнего эффекта структурных команд.
- [ ] Эффект undo:

```ts
useEffect(() => {
  if (!state.workflowAiUndoRequested) return;
  dispatch({ type: "workflow_ai_undo_handled" });
  const snapshot = aiSnapshotRef.current;
  if (!snapshot) return;
  aiSnapshotRef.current = null;
  setGraph(snapshot);
  dispatch({ type: "workflow_ai_undo_availability", available: false });
  chat.append({ role: "assistant", text: "Вернул граф к состоянию до последней правки." });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [state.workflowAiUndoRequested]);
```

  (`setGraph` — реальный сеттер локального стейта графа; имя сверить.)
  Откат мгновенный, без цикла «Думаю…» — пользователь возвращает своё,
  магию не имитируем.
- [ ] При размонтировании вью / смене кампании сбрасывать доступность:
  в существующий cleanup-эффект (или новый) добавить
  `dispatch({ type: "workflow_ai_undo_availability", available: false })`.
- [ ] Применение rebuild валидируется ДО диспатча на клиенте (шаг 8), но
  страховка в вью не нужна — не добавлять.
- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные; `npm run test:e2e`
  зелёные.
- [ ] Commit: `feat(workflow): применение AI-rebuild и откат последней правки`

### Step 8: Prompt-composer — AI-ветка воркфлоу через оркестратор

- [ ] В `prompt-composer.tsx` заменить AI-ветку (строки 348–363, вызов
  `fetchAiStructuralOps`) на вызов оркестратора:

```ts
import { fetchAssist, fetchAssistAvailability } from "@/lib/ai/assist-client";
import { summarizeGraph } from "@/lib/ai/graph-summary";
import { getCachedGraph } from "@/sections/campaigns/workflow-graph-cache";
import { buildDataSummary } from "@/lib/ai/data-summary";
import { validateAiGraph } from "@/state/ai-graph-validation";
import { buildGraphFromSpec } from "@/lib/ai/rebuild-schema";
```

  Пробу `aiAvailable` переключить с `fetchAiAvailability` на
  `fetchAssistAvailability` (старую пробу не импортировать). Ветка:

```ts
if (useAi) {
  const cached = view.kind === "workflow" ? getCachedGraph(view.campaign.id) : undefined;
  const graph = cached ? summarizeGraph(cached) : undefined;
  const selected = selectedWorkflowNode
    ? { id: selectedWorkflowNode.id, label: selectedWorkflowNode.label, nodeType: selectedWorkflowNode.nodeType ?? "default" }
    : undefined;
  const history = chat.messages.filter((m) => !m.pending).slice(-8)
    .map((m) => ({ role: m.role, text: m.text }));
  void (async () => {
    const result = await fetchAssist({
      text: rawText,
      history,
      context: {
        screen: "workflow",
        dataSummary: buildDataSummary({ campaigns: state.campaigns, signals: state.signals }),
        graph,
        selectedNode: selected,
        undoAvailable: state.aiUndoAvailable,
      },
    });
    if (result?.kind === "workflow-ops" && result.ops.length > 0) {
      dispatch({ type: "workflow_structural_commands_submit", ops: result.ops });
    } else if (result?.kind === "rebuild") {
      const signalLabel = cached?.nodes.find((n) => n.data.nodeType === "signal")?.data.label ?? "Сигнал";
      const built = buildGraphFromSpec(result.spec, { label: signalLabel });
      const check = validateAiGraph(built);
      if (check.ok) {
        dispatch({ type: "workflow_rebuild_submit", ...built, assumptions: result.spec.assumptions });
      } else {
        chat.append({ role: "assistant", text: "Не получилось собрать корректную цепочку — попробуйте описать иначе." });
      }
    } else if (result?.kind === "node-params") {
      dispatch({ type: "workflow_node_field_set", nodeId: result.nodeId, patch: result.patch as Partial<NodeParams> });
      chat.append({ role: "assistant", text: result.confirmation });
    } else if (result?.kind === "undo") {
      dispatch({ type: "workflow_ai_undo_request" });
    } else if (result?.kind === "answer") {
      chat.append({ role: "assistant", text: result.text });
    } else if (result?.kind === "clarify") {
      chat.append({ role: "assistant", text: result.questions.join(" ") });
    } else {
      dispatch({ type: "workflow_command_submit", text: rawText }); // легаси-фоллбек
    }
  })();
}
```

  Каст `result.patch as Partial<NodeParams>` — осознанная граница: сервер
  не может строго типизировать union по kind ноды; редьюсер
  `workflow_node_field_set` уже мерджит patch поверх существующих params
  (`patchNodeParams`), невалидные ключи безвредны. Зафиксировать комментарием.
  ВАЖНО: `chat` в composer уже есть (`useChat()`); `state.campaigns/signals/
  aiUndoAvailable` — из `useAppState()`.
- [ ] Ветку «нет AI» не трогать — бит-в-бит прежняя.
- [ ] `npx tsc --noEmit` exit 0; `npm test` зелёные; `npm run test:e2e`
  зелёные (без ключа путь прежний).
- [ ] Commit: `feat(ai): воркфлоу-команды идут через оркестратор с контекстом графа`

### Step 9: Подсказка «↩ Откатить»

- [ ] Найти резолвер подсказок для экрана воркфлоу (от
  `selectPromptSuggestions` → `resolveSuggestions(scope)` → резолвер view
  workflow). В список подсказок добавить ПЕРВОЙ при `state.aiUndoAvailable`:

```ts
{
  id: "ai-undo",
  label: "↩ Откатить",
  action: { kind: "dispatch", action: { type: "workflow_ai_undo_request" } },
},
```

  Для этого резолвер должен видеть `aiUndoAvailable` — проверить, что
  `selectPromptSuggestions(state, ctx)` получает полный state (получает);
  пробросить флаг в scope/контекст резолвера тем же путём, каким туда
  попадают прочие поля стейта.
- [ ] Юнит-тест рядом с существующими тестами подсказок (если есть тест
  select-prompt-suggestions — дополнить; нет — создать минимальный):
  при `aiUndoAvailable: true` и view workflow подсказка `ai-undo` в списке;
  при `false` — отсутствует.
- [ ] `npm test` зелёные.
- [ ] Commit: `feat(ux): подсказка «Откатить» после AI-правки графа`

### Step 10: Живая проверка (при наличии ключа)

- [ ] Dev-сервер 3001, ключ в `.env.local`, черновик воркфлоу.
  Прогнать сценарии:
  1. «хочу чтобы сообщения не использовались» при графе с СМС → нода
     удалена, в чате проговорено что;
  2. «собери прогрев холодной базы» → clarify (≤2 вопросов) → ответить →
     граф пересобран, допущения проговорены, валидатор пройден;
  3. «три смс подряд без пауз» → ровно три смс, без вставленных задержек
     (суверенность);
  4. «откати» → граф вернулся, подсказка исчезла;
  5. выбрать ноду email, «сделай тему короче» → params обновились.
- [ ] Без ключа — пометить «live: not verified (no key)».

### Step 11: Доки и статус

- [ ] Обновить `docs/ai-orchestrator.md`: таблица инструментов — добавить
  четыре новых с их схемами и условиями регистрации; раздел «Откат».
- [ ] Обновить строку 005 в `plans/README.md`.
- [ ] Финальный прогон: `npx tsc --noEmit`, `npm test`, `npm run test:e2e`.
- [ ] Commit: `docs(ai): инструменты графа в архитектурном доке + статус 005`

## Test plan

- Новые юнит: graph-summary, rebuild-schema (+билдер), ai-graph-validation
  (включая прогон 6 шаблонов), контракт (новые kind'ы), подсказка undo.
- Существующие зелёные без правок (applyOps, structural-commands не тронуты).
- E2E зелёные без ключа.
- Живая проверка — 5 сценариев шага 10.

## Done criteria

- [ ] `npx tsc --noEmit`, `npm test`, `npm run test:e2e` — exit 0
- [ ] Прогон валидатора на 6 шаблонах — `ok: true` для всех
- [ ] `grep -n "fetchAiStructuralOps" src/sections/shell/prompt-composer.tsx`
  — пусто (composer на оркестраторе)
- [ ] Подсказка «↩ Откатить» появляется/исчезает по флагу
- [ ] Строка 005 в `plans/README.md` обновлена

## STOP conditions

- `runCycle` в живом коде несовместим с описанным применением rebuild
  (нет способа передать полный новый граф) — не перепиливать runCycle,
  доложить.
- Регистрация условных tools в `generateText` ломается на типах `ai@6`
  и не решается spread-объектом.
- Снапшот/undo требуют менять `applyOps` или `structural-commands.ts`.
- Валидатор заваливает любой из 6 шаблонов и неочевидно, какую проверку
  ослаблять.
- Любой шаг подталкивает закоммитить ключ.

## Maintenance notes

- Снапшот отката живёт в ref воркфлоу-вью → не переживает уход с экрана.
  Это осознанно (§8: глубина 1, прототип); флаг сбрасывается при анмаунте.
- rebuild не несёт пользовательских текстов в params — модель описывает
  структуру, тексты дефолтные. Передача текстов касаний из запроса — вместе
  с fill_wizard_field в следующих итерациях (спека §15).
- Ревьюеру: privacy (в граф-сводке нет params), каст patch в composer,
  отсутствие второго await-пути без ключа.
