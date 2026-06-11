# Plan 001: Устранить гонки в AI-цикле графа воркфлоу

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2d9f2c7..HEAD -- src/sections/campaigns/workflow-view.tsx src/state/structural-commands.ts src/state/structural-commands.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MED (правка горячего файла без тестов; компенсируется ручной проверкой и выносом чистых функций)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2d9f2c7`, 2026-06-11

## Why this matters

Когда пользователь даёт промпт-команду по структуре воркфлоу («добавь смс после email»), UI 3–5 секунд показывает «Думаю...», а затем применяет изменение. Сейчас новый граф **вычисляется в момент получения команды**, а применяется спустя задержку **целиком, затирая текущее состояние**. Любая ручная правка поля ноды, сделанная за время «Думаю...», молча теряется. Вторая проблема: если отправить новую команду, пока первая «думает», таймеры первого цикла отменяются, и его pending-сообщение в чате навсегда остаётся в состоянии «печатает...». Это прототип для тестов с живыми пользователями — оба сценария выглядят как поломка «магии». Этот план — фундамент для plans/002 (реальный AI будет давать команды чаще и с большей задержкой, гонки станут вероятнее).

## Current state

Файлы:

- `src/sections/campaigns/workflow-view.tsx` — канвас воркфлоу; владеет локальным `graph` (useState), эффекты-обработчики команд и `runCycle` (имитация «думания»). Все баги здесь.
- `src/state/structural-commands.ts` — парсер структурных команд и чистая функция `applyOps(graph, ops)` (строка 741). Сюда выносится новый чистый хелпер.
- `src/state/structural-commands.test.ts` — образец стиля юнит-тестов для этого слоя.
- `src/state/chat-context.tsx` — API чата: `append(...) => string (id)` (строка 175), `updatePending(id, text)` (строка 176).

Как течёт команда: `prompt-composer.tsx:294-322` парсит текст → dispatch `workflow_structural_commands_submit` / `workflow_node_command_submit` → `workflow-section.tsx:306-310` передаёт в props `WorkflowView` (`structuralOps`, `nodeCommand`, `nodeFieldPatch`) → эффекты ниже.

`runCycle` — `workflow-view.tsx:314-362` (сокращено):

```ts
function runCycle(opts: {
  durationMs: number;
  apply: (prev: GraphState) => { graph: GraphState; changedIds: Set<string> };
  finalReply: string | null;
}) {
  const { durationMs, apply, finalReply } = opts;
  thinkDurationMsRef.current = durationMs;
  cycleTimersRef.current.forEach(clearTimeout);   // ← line 320: отмена прошлого цикла
  cycleTimersRef.current = [];
  setCyclePhase("thinking");
  const replyId = chat.append({ role: "assistant", text: "", pending: true }); // ← line 328
  let changedIdsAfter: Set<string> = new Set();
  const t1 = setTimeout(() => {
    setGraph((prev) => { const result = apply(prev); ... });
    setCyclePhase("reveal");
    chat.updatePending(replyId, finalReply ?? "Готово.");
  }, durationMs);
  // t2 → idle, t3 → снять justUpdated
}
```

**Баг 1** — эффект структурных операций, `workflow-view.tsx:445-506`. Граф вычисляется из снапшота при получении команды (строка 449), а в `apply` снапшот подставляется как есть, игнорируя `prev`:

```ts
useEffect(() => {
  if (!structuralOps || structuralOps.length === 0) return;
  const result = applyOps(graph, structuralOps);     // ← line 449: снапшот
  ...
  runCycle({
    durationMs: duration,
    apply: () => ({ graph: result.graph, changedIds }), // ← line 500: prev игнорируется
    finalReply: buildReply() || null,
  });
  onStructuralOpsHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [structuralOps]);
```

При этом эффект `nodeFieldPatch` (строки 421-443) применяет ручную правку поля к графу **сразу** через `setGraph((prev) => ...)`. Если она пришла во время «Думаю...» структурного цикла — на reveal её затрёт `result.graph`.

**Баг 2** — эффект `nodeCommand`, `workflow-view.tsx:364-419`: `plans` (патчи параметров нод) вычисляются на строках 369-376 из того же снапшота `graph` (`deriveParamsPatch(text, currentNode?.data.params)`), хотя сами патчи в `apply` накладываются на `prev` корректно. Патч, посчитанный от устаревших params, может перезаписать более свежие.

**Баг 3** — отмена цикла (строка 320) не закрывает pending-сообщение прежнего цикла: `replyId` создан на строке 328, `updatePending` для него вызывается только в `t1`, который уже отменён. В чате навсегда остаются «печатающие» точки.

Диф для зелёной подсветки (строки 479-496) — кандидат на вынос в чистую функцию:

```ts
const oldIds = new Set(graph.nodes.map((n) => n.id));
const oldKindById = new Map(graph.nodes.map(
  (n) => [n.id, (n.data as { nodeType: WorkflowNodeType }).nodeType] as const));
const changedIds = new Set<string>();
for (const n of result.graph.nodes) {
  if (!oldIds.has(n.id)) changedIds.add(n.id);
  else if (oldKindById.get(n.id) !== (n.data as {...}).nodeType) changedIds.add(n.id);
}
```

Конвенции репо: комментарии в коде — русские, поясняют «почему»; `eslint-disable-next-line react-hooks/exhaustive-deps` на командных эффектах — **намеренный паттерн** (эффект должен срабатывать только на приход команды), не удалять.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0, без ошибок |
| Unit tests | `npm test` | 48+ файлов, 625+ тестов, все зелёные |
| Lint | `npm run lint` | НЕ gate: на `2d9f2c7` уже 19 ошибок (в `.claude/` и в неиспользуемых `src/components/ai-elements/*`). Gate: **не появилось новых** ошибок относительно базовой выдачи |
| E2E | `npm run test:e2e` | Playwright сам поднимает dev-сервер; все спеки зелёные (минуты) |

## Scope

**In scope** (только эти файлы можно менять):
- `src/sections/campaigns/workflow-view.tsx`
- `src/state/structural-commands.ts` (только добавить экспортируемый хелпер)
- `src/state/structural-commands.test.ts` (добавить тесты)

**Out of scope** (НЕ трогать, хоть и выглядят смежными):
- `src/sections/shell/prompt-composer.tsx`, `src/sections/campaigns/workflow-section.tsx` — пайплайн команд работает корректно, меняется только применение.
- `src/state/chat-context.tsx` — API чата достаточно.
- `src/state/app-state.ts` — редьюсер не участвует в баге.
- Эффект `pendingCommand` (workflow-view.tsx:284-301) — легаси-путь без цикла «Думаю...», гонок нет.

## Git workflow

По AGENTS.md — работа строго в отдельном worktree:

```bash
git worktree add .worktrees/workflow-cycle-races -b feature/workflow-cycle-races main
cd .worktrees/workflow-cycle-races && npm install
```

Коммиты — conventional commits с русским описанием (пример из истории: `fix(layout): убрать случайно закоммиченную aim dev-инъекцию`). Не пушить в `main`; PR/мердж — решение оператора. Если нужен dev-сервер — порт 3001 (`npm run dev -- -p 3001`): порт 3000 занят основным чекаутом, его не убивать.

## Steps

### Step 1: Вынести диф графа в чистую функцию

В `src/state/structural-commands.ts` рядом с `applyOps` добавить экспортируемую функцию `diffChangedNodeIds(oldGraph: GraphState, newGraph: GraphState): Set<string>` — перенести логику из `workflow-view.tsx:479-496` (новый id ИЛИ изменившийся `nodeType` → в множество). Тип `GraphState` уже используется в сигнатуре `applyOps` в этом файле — переиспользовать его.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Тесты на diffChangedNodeIds

В `src/state/structural-commands.test.ts` (взять стиль существующих кейсов этого файла) добавить тесты: (а) добавленная нода попадает в diff; (б) нода с изменённым `nodeType` (replace) попадает; (в) неизменённые ноды не попадают; (г) пустой diff при идентичных графах.

**Verify**: `npm test -- structural-commands` → все тесты файла зелёные, включая 4 новых.

### Step 3: runCycle — закрывать pending отменённого цикла и принимать finalReply из apply

В `workflow-view.tsx`:

1. Рядом с `cycleTimersRef` завести `const pendingReplyIdRef = useRef<string | null>(null);`
2. Расширить тип `apply`: `(prev: GraphState) => { graph: GraphState; changedIds: Set<string>; finalReply?: string | null }`.
3. В начале `runCycle`, сразу после очистки таймеров: если `pendingReplyIdRef.current !== null` — `chat.updatePending(pendingReplyIdRef.current, "Прервано — выполняю новую команду.")`.
4. После `chat.append(...)` сохранить `pendingReplyIdRef.current = replyId`.
5. В `t1`: `chat.updatePending(replyId, result.finalReply ?? finalReply ?? "Готово.")` (где `result` — возврат `apply(prev)`), затем `pendingReplyIdRef.current = null`.

**Verify**: `npx tsc --noEmit` → exit 0 (вызовы `runCycle` ещё со старым apply — допишутся в шагах 4-5; если tsc ругается на отсутствие `finalReply` в возвратах, это ожидаемо до шага 5 — тогда гонять tsc после шага 5).

### Step 4: Структурный эффект — применять ops к prev

В эффекте `structuralOps` (445-506): предварительный `applyOps(graph, structuralOps)` оставить только для ранней ветки «все ops пропущены» (469-475) и расчёта `duration`. В `runCycle` передать:

```ts
apply: (prev) => {
  const live = applyOps(prev, structuralOps);
  return {
    graph: live.graph,
    changedIds: diffChangedNodeIds(prev, live.graph),
    finalReply: buildReplyFrom(live) || null,
  };
},
```

`buildReply` переписать в параметризованную форму `buildReplyFrom(result)` (логика та же — applied/skipped в строки). Импортировать `diffChangedNodeIds`. Старый блок дифа (479-496) удалить.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: nodeCommand-эффект — считать патчи от prev

В эффекте `nodeCommand` (364-419): перенести вычисление `plans` (369-376) внутрь `apply(prev)` — `deriveParamsPatch(text, ...)` должен читать params ноды из `prev.nodes`, а не из снапшота `graph`. `duration`/`finalReply`-текст считаются от `nodeCommand.length` — это можно оставить снаружи.

**Verify**: `npx tsc --noEmit` → exit 0; `npm test` → все зелёные.

### Step 6: Ручная проверка сценариев гонки

Поднять dev-сервер на 3001. В черновике кампании (Кампании → черновик → воркфлоу):

1. Отправить «добавь смс после email» → за время «Думаю...» открыть любую ноду и поменять поле → после reveal проверить: правка поля **сохранилась**, новая нода появилась.
2. Отправить две структурные команды подряд (вторую — во время «Думаю...» первой) → первое сообщение в чате должно закрыться текстом «Прервано — выполняю новую команду.», второе — выполниться; «вечно печатающих» сообщений нет.

Если браузерных инструментов в окружении нет — пометить шаг как «manual check pending» в финальном отчёте, не выдумывать результат.

**Verify**: оба сценария воспроизведены и ведут себя как описано (или шаг явно помечен пропущенным).

### Step 7: Полная верификация

**Verify**: `npx tsc --noEmit` → exit 0; `npm test` → все зелёные; `npm run test:e2e` → все спеки зелёные; `npm run lint` → нет новых ошибок относительно базы.

## Test plan

- Новые юнит-тесты: `src/state/structural-commands.test.ts` — 4 кейса `diffChangedNodeIds` (шаг 2), образец стиля — существующие тесты в том же файле.
- Регрессия логики применения: существующие тесты `applyOps` в том же файле должны остаться зелёными без правок.
- Поведение компонента проверяется вручную (шаг 6) + полным e2e-прогоном; компонентные тесты на WorkflowView не пишем — ReactFlow в jsdom требует обвязки, это вне масштаба плана.

## Done criteria

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm test` exit 0; 4 новых теста `diffChangedNodeIds` существуют и проходят
- [ ] `npm run test:e2e` exit 0
- [ ] В `workflow-view.tsx` нет применения заранее вычисленного графа: `grep -n "apply: () =>" src/sections/campaigns/workflow-view.tsx` → пусто
- [ ] `git status` — изменены только in-scope файлы
- [ ] Строка плана в `plans/README.md` обновлена

## STOP conditions

Остановиться и доложить (не импровизировать), если:

- Код по адресам из "Current state" не совпадает с выдержками (репо уехало вперёд).
- Выясняется, что `chat.updatePending` нельзя вызвать для уже закрытого сообщения без ошибки/дубля — нужно решение оператора по UX «прерванного» сообщения.
- Ранняя ветка «все ops пропущены» (469-475) конфликтует с переносом applyOps в apply так, что reply за пределами цикла начинает дублироваться.
- Фикс требует менять `workflow-section.tsx` или `chat-context.tsx` (out of scope).
- Верификация шага падает дважды после разумной попытки исправления.

## Maintenance notes

- plans/002 (реальный AI) сядет поверх этого же пайплайна: задержка станет реальной сетевой, и `apply(prev)` — единственная корректная точка применения. Ревьюеру смотреть: не вернулся ли где-то захват снапшота `graph` в замыкание цикла.
- Текст «Прервано — выполняю новую команду.» — кандидат на доводку UX-писателем; место одно, в `runCycle`.
- Сознательно отложено: гонка между `nodeFieldPatch` и фазой reveal в пределах одного тика React (теоретическая) — не наблюдаема при реальных задержках.
