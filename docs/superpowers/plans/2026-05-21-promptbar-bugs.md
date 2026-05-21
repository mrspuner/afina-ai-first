# PromptBar bugs (Block E) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Починить четыре бага PromptBar: (1) отсутствие иконки в чипах узла/параметра; (2) дублирование тег+текст при клике на AI-параметр; (3) парковка предыдущего тега в основном composer (ShellBottomBar) + корректное затирание тега без текста в ChatComposer; (4) hover-highlight чипа.

**Architecture:** Снизу вверх и изолированными коммитами — каждый таск фиксит ровно один баг и может быть откачен независимо. Сначала data-слой (pre-render SVG-иконок), затем визуальный рендер чипа + hover-css, затем устранение дубля в node-card, затем фикс парковки в ChatComposer, затем перенос парковки в ShellBottomBar. Логика парковки уже централизована в `useDraftQueue.parkDraft` (pure reducer + dedup) — нашим задачей будет правильно её вызвать.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, motion v12 (`motion/react`), vitest для pure-функций/reducer-логики, ручная верификация через `npm run dev` для DOM/SVG/CSS-only фиксов.

**Spec:** `docs/superpowers/specs/2026-05-21-promptbar-bugs-design.md`
**Ветка/воркстри:** `feature/promptbar-bugs` / `.worktrees/promptbar-bugs`

---

## File Structure

**Modify:**
- `src/sections/campaigns/node-visuals.ts` — добавить `NODE_ICON_SVG` (pre-render через `renderToStaticMarkup`) и `getNodeIconSvg(nodeType)`.
- `src/components/ai-elements/chip-editable-input.tsx` — `createChipElement` рендерит иконку из SVG-строки, навешивает класс `chip-hover` + `cursor-pointer transition-all duration-150`.
- `src/app/globals.css` — добавить `.chip-hover:hover { filter: brightness(1.18); }`.
- `src/sections/campaigns/node-card-content.tsx` — удалить вызов `insertPrompt(template)` в `handleAiField` (дубль текста).
- `src/sections/shell/chat-composer.tsx` — фикс `parkPreviousIfNeeded`: старый чип удаляется ВСЕГДА (а не только когда был текст).
- `src/sections/shell/shell-bottom-bar.tsx` — добавить `parkPreviousIfNeeded` (по образцу ChatComposer), передать его в `<ChipEditableInput onTagSwap={...}>`, сбрасывать `prevActiveRef.current = null` после успешного сабмита.
- `src/state/draft-queue-context.test.ts` — расширить тестами sequence-поведения парковки A→B (с текстом и без текста).

**Не модифицируем:**
- `src/state/prompt-bar-enter.ts` — Apply-on-Enter уже корректен (verified в спеке §3.7).
- `src/state/apply-draft.ts` — без изменений.
- `src/state/draft-queue-context.tsx` — reducer `parkDraft` уже дедупит и no-op на пустом тексте.
- `src/state/prompt-chips-context.tsx` — без изменений.
- `src/sections/shell/draft-queue-list.tsx` — без изменений.

---

## Task 0: Создать worktree и подтвердить зелёный baseline

**Files:** none (setup)

- [ ] **Step 1: Создать worktree и ветку**

Run из корня репозитория (`/home/user/afina-ai-first`):

```bash
git worktree add .worktrees/promptbar-bugs -b feature/promptbar-bugs main
cd .worktrees/promptbar-bugs
npm install
```

- [ ] **Step 2: Проверить, что baseline зелёный**

```bash
npm test
npm run lint
```

Expected: оба зелёные. Если падает — фиксируем baseline или сообщаем пользователю прежде чем продолжать.

**Все последующие шаги выполняются внутри `.worktrees/promptbar-bugs/`.**

---

## Task 1: Pre-rendered SVG-иконки в `node-visuals.ts`

Чисто data-слой: добавляем pre-rendered SVG-строки для иконок типов узлов. Никакого UI пока не меняется — этот таск создаёт API, которое будет использовано в Task 2.

**Files:**
- Modify: `src/sections/campaigns/node-visuals.ts`

- [ ] **Step 1: Добавить импорты и pre-render map**

Открыть `src/sections/campaigns/node-visuals.ts`. В начало файла, СРАЗУ ПОСЛЕ существующего `import type { WorkflowNodeType } from "@/types/workflow";` (после строки 17), добавить два импорта:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
```

Затем в конец файла (после функции `getNodeIcon`) добавить:

```ts
/**
 * Pre-rendered SVG-строки для иконок типов узлов. Рендер происходит один
 * раз при импорте модуля (React DOM Server работает и на сервере, и в
 * браузере). Используется в чипах PromptBar — там React не управляет
 * содержимым (contentEditable + императивный DOM), поэтому Lucide-компонент
 * нельзя смонтировать обычным путём, а строку — можно: вставляем через
 * `innerHTML` в нейтральный <span aria-hidden>.
 *
 * Lucide SVG задают `stroke="currentColor"` — цвет наследуется от родителя.
 */
const NODE_ICON_SVG: Partial<Record<WorkflowNodeType, string>> =
  Object.fromEntries(
    Object.entries(NODE_ICON).map(([nodeType, Icon]) => [
      nodeType,
      renderToStaticMarkup(
        createElement(Icon, {
          size: 14,
          strokeWidth: 2,
          "aria-hidden": true,
        })
      ),
    ])
  ) as Partial<Record<WorkflowNodeType, string>>;

/** SVG-строка иконки узла или null, если для типа иконки нет. */
export function getNodeIconSvg(nodeType: string): string | null {
  return NODE_ICON_SVG[nodeType as WorkflowNodeType] ?? null;
}
```

- [ ] **Step 2: Lint + typecheck (через build-light)**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 3: Прогон тестов**

```bash
npm test
```

Expected: PASS (поведение не изменилось, добавлены только новые экспорты — существующие тесты не должны падать).

- [ ] **Step 4: Manual sanity check через node**

Быстрая проверка, что `getNodeIconSvg` действительно возвращает SVG:

```bash
node --input-type=module -e "import('./src/sections/campaigns/node-visuals.ts').then(m => console.log(m.getNodeIconSvg('sms')?.slice(0,40)))" 2>&1 || true
```

Может не сработать без TS-loader — это нормально. Главное, что lint и vitest зелёные. Финальную проверку отрисовки оставляем на Task 2 (где иконка появится в UI).

- [ ] **Step 5: Коммит**

```bash
git add src/sections/campaigns/node-visuals.ts
git commit -m "feat(node-visuals): pre-render Lucide icons to SVG strings for chip use"
```

---

## Task 2: Чип с иконкой + hover-highlight

Этот таск — pure DOM/SVG/CSS-визуал. Тестируем вручную через дев-сервер: ни pure-функции, ни reducer'а не вводим.

**Files:**
- Modify: `src/components/ai-elements/chip-editable-input.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Добавить hover-CSS в `globals.css`**

Открыть `src/app/globals.css`. Найти `@layer base { ... }` блок в конце файла (примерно строки 172-182). СРАЗУ ПОСЛЕ закрывающей `}` этого блока (то есть в самом конце файла) добавить:

```css
/* PromptBar chip hover — full-pill brightness boost.
   Применяется к контенту, который рендерит ChipEditableInput императивно;
   inline-style цвет узла + Tailwind-классы для нейтральных чипов одинаково
   реагируют на `filter: brightness(...)`. Используем статичный CSS-класс,
   а не Tailwind-utility, потому что JIT не всегда подхватывает классы
   внутри contentEditable'а. */
.chip-hover {
  cursor: pointer;
}
.chip-hover:hover {
  filter: brightness(1.18);
}
```

- [ ] **Step 2: Импортировать `getNodeIconSvg` в `chip-editable-input.tsx`**

Открыть `src/components/ai-elements/chip-editable-input.tsx`. После строки 18 (`import { cn } ...`) добавить новый импорт:

```ts
import { getNodeIconSvg } from "@/sections/campaigns/node-visuals";
```

- [ ] **Step 3: Заменить `createChipElement`**

Найти существующую функцию `createChipElement` (строки 430-449). Полностью заменить её на:

```ts
function createChipElement(chip: PromptChip): HTMLElement {
  const el = document.createElement("span");
  el.contentEditable = "false";
  el.setAttribute("data-chip-id", chip.id);
  el.setAttribute("data-chip-kind", chip.kind);
  el.className =
    "chip-hover mx-0.5 inline-flex select-none items-center gap-1 rounded-md border px-2 py-0.5 align-baseline text-xs font-medium transition-all duration-150";

  // Окраска по цвету узла (NodeTagPayload). Прочие чипы — нейтральный стиль.
  const payload = chip.payload as
    | { color?: string; nodeType?: string }
    | null;
  const color =
    payload && typeof payload.color === "string" ? payload.color : null;
  if (color) {
    el.style.borderColor = `${color}66`;
    el.style.backgroundColor = `${color}1f`;
    el.style.color = color;
  } else {
    el.classList.add("border-white/15", "bg-white/10", "text-white");
  }

  // Иконка узла (или узла-родителя для тега параметра). Цвет тега уже
  // указывает на узел; иконка усиливает это сходство. Lucide SVG имеет
  // stroke="currentColor" — цвет наследуется от родительского color.
  const nodeType =
    payload && typeof payload.nodeType === "string" ? payload.nodeType : null;
  if (nodeType) {
    const iconSvg = getNodeIconSvg(nodeType);
    if (iconSvg) {
      const iconWrap = document.createElement("span");
      iconWrap.setAttribute("aria-hidden", "true");
      iconWrap.className = "inline-flex shrink-0 items-center";
      iconWrap.innerHTML = iconSvg;
      el.appendChild(iconWrap);
    }
  }

  el.appendChild(document.createTextNode(chip.label));
  return el;
}
```

- [ ] **Step 4: Поправить label-update внутри sync-эффекта**

Файл `chip-editable-input.tsx` содержит ещё одно место, где меняется содержимое чипа — sync-эффект `chips → DOM` (строки 220-230). Сейчас он делает `el.textContent = target.label`, что снесёт нашу иконку. Нужно обновлять ТОЛЬКО текстовый узел внутри пилла, не трогая `<span aria-hidden>` с иконкой.

Найти блок (примерно строки 220-231):

```ts
    // Remove DOM chips not in state.
    ed.querySelectorAll<HTMLElement>("[data-chip-id]").forEach((el) => {
      const id = el.dataset.chipId!;
      if (!stateById.has(id)) {
        el.remove();
      } else {
        // Update label if it changed.
        const target = stateById.get(id)!;
        if (el.textContent !== target.label) {
          el.textContent = target.label;
        }
      }
    });
```

Заменить на:

```ts
    // Remove DOM chips not in state.
    ed.querySelectorAll<HTMLElement>("[data-chip-id]").forEach((el) => {
      const id = el.dataset.chipId!;
      if (!stateById.has(id)) {
        el.remove();
      } else {
        // Update label if it changed. Trailing text node carries the label;
        // we mutate it in place so the leading <span aria-hidden> icon
        // (if any) survives the update. createChipElement always appends
        // the text as the last child via document.createTextNode().
        const target = stateById.get(id)!;
        const last = el.lastChild;
        if (
          last &&
          last.nodeType === Node.TEXT_NODE &&
          last.textContent !== target.label
        ) {
          last.textContent = target.label;
        } else if (!last || last.nodeType !== Node.TEXT_NODE) {
          // No text node (shouldn't happen, but fail-safe): append one.
          el.appendChild(document.createTextNode(target.label));
        }
      }
    });
```

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 6: Тесты**

```bash
npm test
```

Expected: всё зелёное (изменения в DOM-рендере не покрыты unit-тестами; reducer-тесты затрагиваются только при изменении логики, которой здесь нет).

- [ ] **Step 7: Manual verification — иконка + hover**

Запустить дев-сервер (порт 3001, чтобы не конфликтовать с возможным основным чек-аутом на 3000):

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/promptbar-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200.

В браузере на `http://localhost:3001`:

1. Открыть workflow draft-кампании (через пресет в dev-панели или вручную).
2. Кликнуть на ноду «SMS» — в PromptBar появляется тег с цветом узла и иконкой `MessageSquare` слева от подписи.
3. Кликнуть на ноду «Email» — иконка `Mail`.
4. Кликнуть на ноду «Wait» — иконка `Clock`.
5. Раскрыть узел SMS, кликнуть на mascot-иконку рядом с полем «Текст» — в PromptBar появляется тег параметра с иконкой `MessageSquare` (это иконка узла-родителя).
6. Навести мышь на чип — весь чип становится ярче (~+18%), курсор `pointer`.
7. Увести мышь — чип возвращается к исходной яркости плавно (transition 150ms).

Если хоть один пункт не воспроизводится — фиксить прежде чем коммитить.

- [ ] **Step 8: Остановить дев-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

- [ ] **Step 9: Коммит**

```bash
git add src/components/ai-elements/chip-editable-input.tsx src/app/globals.css
git commit -m "fix(promptbar): render node icon inside chips and add hover brightness"
```

---

## Task 3: Убрать дубль text+tag при клике на AI-параметр

Чисто localный фикс в `node-card-content.tsx`: удаляем вставку текста-шаблона. После фикса клик на mascot-иконку рядом с AI-полем добавляет только тег.

**Files:**
- Modify: `src/sections/campaigns/node-card-content.tsx`

- [ ] **Step 1: Удалить `insertPrompt(template)` из `handleAiField`**

Найти в `src/sections/campaigns/node-card-content.tsx` функцию `handleAiField` (примерно строки 165-185):

```ts
  function handleAiField(rowLabel: string) {
    const template = templateByLabel.get(rowLabel);
    if (template) insertPrompt(template);
    const nodeType = data.nodeType;
    const payload: NodeTagPayload = {
      nodeId: id,
      nodeType,
      color: getNodeColor(nodeType),
      paramLabel: rowLabel,
    };
    pushChip({
      // Один активный тег на инпут — id фиксированный по узлу+полю, повторный
      // клик переписывает чип, а не плодит новые (push дедупит по id).
      id: `nodefield_${id}_${rowLabel}`,
      kind: "node",
      // Имя узла не пишем — цвет тега обозначает узел (спека M5.2).
      label: rowLabel,
      payload,
      removable: true,
    });
  }
```

Заменить на (полностью убираем строки про `template` и `insertPrompt`):

```ts
  function handleAiField(rowLabel: string) {
    const nodeType = data.nodeType;
    const payload: NodeTagPayload = {
      nodeId: id,
      nodeType,
      color: getNodeColor(nodeType),
      paramLabel: rowLabel,
    };
    pushChip({
      // Один активный тег на инпут — id фиксированный по узлу+полю, повторный
      // клик переписывает чип, а не плодит новые (push дедупит по id).
      id: `nodefield_${id}_${rowLabel}`,
      kind: "node",
      // Имя узла не пишем — цвет тега обозначает узел (спека M5.2).
      label: rowLabel,
      payload,
      removable: true,
    });
  }
```

`insertPrompt`, `templateByLabel`, `actions` остаются как есть — могут использоваться в других местах (suggestion catalog) и удаление dead-code-я выходит за scope блока E.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: clean. Если linter ругается на неиспользуемые `insertPrompt`/`templateByLabel` — это OK для прототипа, но проверьте, что ругань именно про unused, а не про сломанный код. Если ругань блокирующая, добавьте `// eslint-disable-next-line @typescript-eslint/no-unused-vars` перед соответствующей строкой.

- [ ] **Step 3: Тесты**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Manual verification**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/promptbar-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

В браузере:

1. Открыть workflow draft-кампании.
2. Кликнуть на узел SMS, чтобы раскрыть его.
3. Кликнуть на mascot-иконку рядом с полем «Текст».
4. **Ожидание:** в PromptBar появляется ТОЛЬКО тег «Текст» с иконкой MessageSquare. **Никакого** текста-шаблона типа «Сделай текст дружелюбнее…» в инпуте нет.
5. Повторить для «Email → Тема»: появляется только тег «Тема» с иконкой `Mail`, без шаблонного текста.
6. (Регресс-чек) Кликнуть на саму ноду SMS (не на параметр) — появляется тег узла «SMS» с иконкой. Тоже без текста.

- [ ] **Step 5: Остановить дев-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

- [ ] **Step 6: Коммит**

```bash
git add src/sections/campaigns/node-card-content.tsx
git commit -m "fix(promptbar): drop template-text insert on AI param click, keep tag only"
```

---

## Task 4: Парковка в ChatComposer — затирать тег без текста (TDD)

Парковка в `ChatComposer.parkPreviousIfNeeded` сейчас удаляет старый чип ТОЛЬКО если в нём был текст. Без текста — старый чип остаётся, новый кладётся параллельно. Нужно: старый чип убираем ВСЕГДА, а парковка в очередь происходит только если был текст. Эту логику покрываем reducer-уровневыми тестами в `draft-queue-context.test.ts` (фрагмент логики, который мы реально гарантируем, — корректное поведение `parkDraft` на пустом тексте), а саму смену в компоненте проверяем вручную.

**Files:**
- Modify: `src/state/draft-queue-context.test.ts`
- Modify: `src/sections/shell/chat-composer.tsx`

- [ ] **Step 1: Расширить reducer-тесты sequence-сценариями**

Открыть `src/state/draft-queue-context.test.ts`. В конец файла (после последнего `it(...)` в существующем `describe`, перед закрывающей `});`) добавить новый describe-блок:

```ts
describe("draftQueueReducer — A → B sequence (block-E semantics)", () => {
  it("A with text → B: A is parked (one draft), order preserved", () => {
    // Парковка А с текстом перед добавлением B (B-парковка не вызывается —
    // у B ещё нет текста). Очередь: 1 черновик A.
    let s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "сделай дружелюбнее",
    });
    expect(s.drafts).toHaveLength(1);
    expect(s.drafts[0].chip.id).toBe("nodefield_A_Текст");
    expect(s.drafts[0].text).toBe("сделай дружелюбнее");
  });

  it("A without text → B: parkDraft is a no-op, queue stays empty", () => {
    // Если у А не было текста, парковщик вызывает parkDraft со строкой "".
    // Reducer должен вернуть тот же state (no-op) — A не сохраняется в очереди.
    const s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "",
    });
    expect(s).toBe(empty);
    expect(s.drafts).toEqual([]);
  });

  it("A with text, B with text → both parked in order", () => {
    let s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "первый",
    });
    s = draftQueueReducer(s, {
      type: "park",
      id: "d2",
      chip: chip("nodefield_B_Тема"),
      text: "второй",
    });
    expect(s.drafts.map((d) => d.chip.id)).toEqual([
      "nodefield_A_Текст",
      "nodefield_B_Тема",
    ]);
    expect(s.drafts.map((d) => d.text)).toEqual(["первый", "второй"]);
  });

  it("A with text then A re-parked with empty text: original draft stays", () => {
    // Edge case: defensive guard. Re-park с пустым текстом — no-op,
    // существующий draft A не должен быть стёрт.
    let s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "сохрани меня",
    });
    s = draftQueueReducer(s, {
      type: "park",
      id: "d2",
      chip: chip("nodefield_A_Текст"),
      text: "",
    });
    expect(s.drafts).toHaveLength(1);
    expect(s.drafts[0].text).toBe("сохрани меня");
  });
});
```

- [ ] **Step 2: Прогнать тесты — должны пройти (поведение reducer'а не меняем)**

```bash
npm test -- draft-queue-context
```

Expected: PASS. Reducer уже корректно обрабатывает пустой текст как no-op (см. `case "park"`), новые тесты лишь закрепляют это для seq-сценариев A→B блока E.

- [ ] **Step 3: Коммит reducer-тестов**

```bash
git add src/state/draft-queue-context.test.ts
git commit -m "test(draft-queue): cover A→B sequence with/without text (block-E)"
```

- [ ] **Step 4: Поправить `parkPreviousIfNeeded` в ChatComposer**

Открыть `src/sections/shell/chat-composer.tsx`. Найти функцию `parkPreviousIfNeeded` (строки 98-106):

```ts
    /** Паркует предыдущий активный тег при смене тега (вызов из onTagSwap). */
    function parkPreviousIfNeeded() {
      const prev = prevActiveRef.current;
      if (prev && prev.text.trim().length > 0) {
        parkDraft(prev.chip, prev.text);
        removeChip(prev.chip.id);
      }
      setFromQueueChipId(null);
    }
```

Заменить на:

```ts
    /**
     * Паркует предыдущий активный тег при смене тега (вызов из onTagSwap).
     * Старый чип убираем ВСЕГДА: либо запаркован (если в нём был текст),
     * либо затёрт (текста не было — нечего сохранять). Без unconditional-
     * remove новый чип ляжет рядом со старым (ТЗ §7.2 «без текста → A
     * затирается → в инпуте появляется B»).
     */
    function parkPreviousIfNeeded() {
      const prev = prevActiveRef.current;
      if (!prev) {
        setFromQueueChipId(null);
        return;
      }
      if (prev.text.trim().length > 0) {
        parkDraft(prev.chip, prev.text);
      }
      removeChip(prev.chip.id);
      setFromQueueChipId(null);
    }
```

- [ ] **Step 5: Lint + тесты**

```bash
npm run lint
npm test
```

Expected: оба зелёные.

- [ ] **Step 6: Manual verification — парковка в drawer ChatComposer**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/promptbar-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

В браузере:

1. Открыть workflow draft-кампании.
2. Открыть chat-drawer (иконка справа от PromptBar или соответствующий триггер). Composer drawer'а — это `ChatComposer`.
3. Кликнуть на параметр «Текст» узла SMS — тег A в инпуте drawer'а.
4. Ввести текст: «Привет {name}».
5. Кликнуть на параметр «Тема» узла Email — **ожидание:** тег A с текстом уходит в очередь (видно в `DraftQueueList`), в инпуте drawer'а — только тег B.
6. Кликнуть на параметр «Длительность» узла Wait БЕЗ ввода текста — **ожидание:** тег B исчезает (не паркуется, текста не было), в инпуте — тег C; очередь не выросла (там по-прежнему только A).
7. Кликнуть по карточке A в очереди — A возвращается в инпут с текстом, C уходит в очередь (если в C был текст — да, если не было — затирается).

- [ ] **Step 7: Остановить дев-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

- [ ] **Step 8: Коммит**

```bash
git add src/sections/shell/chat-composer.tsx
git commit -m "fix(chat-composer): always remove previous chip on tag swap, even when empty"
```

---

## Task 5: Парковка в ShellBottomBar (главный composer)

`ShellBottomBar` — основной composer, используемый на campaign/workflow/sections экранах. Сейчас он НЕ передаёт `onTagSwap`, поэтому парковки в нём нет вообще: смена тега → старый просто исчезает с текстом. Повторяем механику ChatComposer.

**Files:**
- Modify: `src/sections/shell/shell-bottom-bar.tsx`

- [ ] **Step 1: Добавить импорты**

Открыть `src/sections/shell/shell-bottom-bar.tsx`. Найти существующие импорты `prompt-chips-context` и `draft-queue-context`:

```ts
import { usePromptChips, isNodeTagPayload } from "@/state/prompt-chips-context";
```

Заменить на (добавить `ChipSegment` type-only):

```ts
import {
  usePromptChips,
  isNodeTagPayload,
  type ChipSegment,
} from "@/state/prompt-chips-context";
```

`useDraftQueue` уже импортирован выше (строка 36) — ничего добавлять не надо.

- [ ] **Step 2: Достать `parkDraft` из `useDraftQueue` и добавить `prevActiveRef`**

Найти в компоненте `ShellBottomBar` блок (примерно строка 134):

```ts
  const { drafts: draftsRef, clearQueue } = useDraftQueue();
```

Заменить на:

```ts
  const { drafts: draftsRef, clearQueue, parkDraft } = useDraftQueue();
```

Затем сразу после блока, который объявляет `editorRef` (строка 141):

```ts
  const editorRef = useRef<ChipEditableInputHandle>(null);
```

Добавить — ровно ниже этой строки — ref для активного сегмента:

```ts
  // Snapshot активного сегмента (тег + текст) — обновляется при изменении
  // chips, нужен для парковки предыдущего тега при смене (M5/ТЗ §7.2).
  const prevActiveRef = useRef<ChipSegment | null>(null);
```

- [ ] **Step 3: Снимок активного сегмента в существующий useEffect**

Найти существующий useEffect, который мирорит активный тег в `activeTag`/`hasTypedText` (строки 151-156):

```ts
  useEffect(() => {
    const seg = editorRef.current?.getActiveSegment() ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTag(seg ? seg.chip : null);
    setHasTypedText(seg ? seg.text.trim().length > 0 : false);
  }, [chipsApi.chips, textInput.value]);
```

Заменить на (добавляем синхронизацию `prevActiveRef`):

```ts
  useEffect(() => {
    const seg = editorRef.current?.getActiveSegment() ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTag(seg ? seg.chip : null);
    setHasTypedText(seg ? seg.text.trim().length > 0 : false);
    // Keep prevActiveRef snapshot fresh so parkPreviousIfNeeded picks up the
    // latest (chip + currently-typed text) when the user switches tags.
    if (seg) prevActiveRef.current = seg;
  }, [chipsApi.chips, textInput.value]);
```

- [ ] **Step 4: Добавить `parkPreviousIfNeeded`**

В том же компоненте, СРАЗУ ПОСЛЕ закрывающей `}` этого useEffect (то есть после строки `}, [chipsApi.chips, textInput.value]);`), добавить:

```ts
  /**
   * Паркует предыдущий активный тег при смене тега (вызов из onTagSwap
   * ChipEditableInput'а). Старый чип убираем ВСЕГДА: либо запаркован, либо
   * затёрт. См. ТЗ §7.2 и `ChatComposer.parkPreviousIfNeeded`.
   */
  function parkPreviousIfNeeded() {
    const prev = prevActiveRef.current;
    if (!prev) return;
    if (prev.text.trim().length > 0) {
      parkDraft(prev.chip, prev.text);
    }
    chipsApi.removeChip(prev.chip.id);
    prevActiveRef.current = null;
  }
```

- [ ] **Step 5: Передать `onTagSwap` в `ChipEditableInput`**

Найти в JSX рендере `<ChipEditableInput>` (строки 298-302):

```tsx
          <ChipEditableInput
            ref={editorRef}
            className="px-3 py-2"
            placeholder={chatPlaceholder}
          />
```

Заменить на:

```tsx
          <ChipEditableInput
            ref={editorRef}
            className="px-3 py-2"
            placeholder={chatPlaceholder}
            onTagSwap={parkPreviousIfNeeded}
          />
```

- [ ] **Step 6: Сбрасывать `prevActiveRef.current` в финализирующих ветках `handlePromptSubmit`**

После сабмита (apply-all, node-command-submit) ref должен быть очищен, иначе следующий push нового чипа попытается запарковать только что отправленный.

Найти ветку `if (decision.kind === "apply-all")` (строки 168-174):

```ts
    if (decision.kind === "apply-all") {
      for (const d of draftsRef) applyDraftToNode(dispatch, d.chip, d.text);
      clearQueue();
      chipsApi.clearChips();
      editorRef.current?.clear();
      return;
    }
```

Заменить на:

```ts
    if (decision.kind === "apply-all") {
      for (const d of draftsRef) applyDraftToNode(dispatch, d.chip, d.text);
      clearQueue();
      chipsApi.clearChips();
      editorRef.current?.clear();
      prevActiveRef.current = null;
      return;
    }
```

Найти ниже ветку node-commands (строки 215-222):

```ts
    if (nodeCommands.length > 0) {
      dispatch({
        type: "workflow_node_command_submit",
        commands: nodeCommands,
      });
      chipsApi.clearChips();
      editorRef.current?.clear();
    }
```

Заменить на:

```ts
    if (nodeCommands.length > 0) {
      dispatch({
        type: "workflow_node_command_submit",
        commands: nodeCommands,
      });
      chipsApi.clearChips();
      editorRef.current?.clear();
      prevActiveRef.current = null;
    }
```

- [ ] **Step 7: Lint + тесты**

```bash
npm run lint
npm test
```

Expected: оба зелёные.

- [ ] **Step 8: Manual verification — парковка в основном PromptBar**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/promptbar-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

В браузере на `http://localhost:3001`:

1. Открыть workflow draft-кампании.
2. В основном (нижнем) PromptBar — НЕ в drawer'е — кликнуть на параметр «Текст» узла SMS. Тег A появился в инпуте.
3. Ввести текст: «Привет {name}».
4. Кликнуть на параметр «Тема» узла Email. **Ожидание:** A с текстом ушёл в очередь (карточка появилась в `DraftQueueList` под PromptBar'ом), в инпуте остался только тег B.
5. БЕЗ ввода текста кликнуть на «Длительность» узла Wait. **Ожидание:** B исчез (не запаркован), в инпуте — C. Очередь по-прежнему содержит только A.
6. Ввести текст «5 минут» в инпут (тег C активен).
7. Нажать Enter. **Ожидание:** команда применилась к Wait (заметна анимация / обновление), инпут очистился, тег C удалён. Очередь содержит только A (если она была непустой).
8. Кликнуть на карточку A в очереди → A вернулся в инпут с текстом «Привет {name}».
9. Кликнуть на узел Email (просто на узел, не на параметр) — A с текстом ушёл обратно в очередь, в инпуте тег Email.
10. (Регресс-чек) В drawer'е (Task 4) парковка по-прежнему работает.

- [ ] **Step 9: Остановить дев-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

- [ ] **Step 10: Коммит**

```bash
git add src/sections/shell/shell-bottom-bar.tsx
git commit -m "feat(shell-bottom-bar): park previous tag on swap, mirroring ChatComposer"
```

---

## Task 6: End-to-end acceptance + Apply-on-Enter verification

Финальный полный прогон: каждый acceptance-criterion из спеки §5 + verified-пункт про Enter (спека §3.7).

**Files:** none

- [ ] **Step 1: Полный прогон тестов и линта**

```bash
npm test
npm run lint
```

Expected: оба зелёные. Если что-то не зелёное — фиксить прежде чем переходить к ручной проверке.

- [ ] **Step 2: Полная ручная проверка матрицы acceptance**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/promptbar-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200.

В браузере на `http://localhost:3001`. Открыть workflow draft-кампании. Для каждой строки таблицы — выполнить и убедиться, что результат совпадает с ожиданием.

| # | Действие | Ожидание | Покрывает |
|---|---|---|---|
| 1 | Клик на узел SMS | Тег с иконкой `MessageSquare`, цвет узла | AC §5.1 (icon в теге узла) |
| 2 | Клик на параметр «Текст» SMS | Тег «Текст» с иконкой `MessageSquare` (родитель), без вставленного шаблона | AC §5.1, §5.2 |
| 3 | Клик на параметр «Тема» Email | Тег «Тема» с иконкой `Mail`, без шаблона | AC §5.1, §5.2 |
| 4 | Hover на любой чип | Весь чип ярче (+18%), курсор pointer, плавный transition | AC §5.4 |
| 5 | (DRAWER) Тег A + текст «привет» → клик на параметр B | A в очереди, в инпуте только B | §7.2, AC §5.3 |
| 6 | (DRAWER) Тег A без текста → клик на параметр B | A исчез (затёрт), в инпуте только B | §7.2, AC §5.3 |
| 7 | (BOTTOM-BAR) Тег A + текст → клик на параметр B | A в очереди, в инпуте только B | §7.2, AC §5.3 (main composer) |
| 8 | (BOTTOM-BAR) Тег A без текста → клик на параметр B | A затёрт, в инпуте только B | §7.2, AC §5.3 |
| 9 | Тег + текст «5 минут» + Enter | Команда применилась (анимация в графе), инпут очистился | AC §5.5 (Apply-on-Enter verified) |
| 10 | Пустая очередь, тег + Enter без текста | Noop (тег остаётся, ничего не применяется) | spec §3.7 (`noop` kind) |
| 11 | Непустая очередь, инпут пуст + ввести «Применить все изменения» + Enter | Все черновики применены, очередь очищена | §3.7 (apply-all) |
| 12 | Backspace на чипе с иконкой | Весь чип (с иконкой) удаляется одним нажатием | spec §8 (regression) |
| 13 | Клик по карточке в очереди | Черновик возвращается в инпут с текстом + иконкой | regression |

Если какой-то ряд не соответствует — фиксить прежде чем закрывать таск.

- [ ] **Step 3: Остановить дев-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

- [ ] **Step 4: Финальный коммит, если были hotfix'ы**

Если в Step 2 что-то правилось — закоммитить с описательным сообщением:

```bash
git status
# Если есть изменения:
git add <конкретные файлы>
git commit -m "fix(promptbar): <конкретное описание правки>"
```

- [ ] **Step 5: Отчитаться пользователю**

Сообщить:
- Ветка: `feature/promptbar-bugs`
- Worktree: `.worktrees/promptbar-bugs`
- Количество коммитов на ветке: `git log --oneline main..HEAD | wc -l`
- Что осталось — мерж/PR (это решение пользователя, агент не мержит сам).
