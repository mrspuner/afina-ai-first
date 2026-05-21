# Карточки сценариев + каталог без категорий — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить кнопку «Запустить сценарий» внутрь каждой карточки сценария, убрать категоризацию из каталога, унифицировать размеры кнопок мастера со стандартом `<Button size="default">`, а в каталоге сделать описание карточек белым на более тёмном фоне.

**Architecture:** Снизу вверх. Сначала расширяем `ScenarioCard` props новым полем `variant` и переводим элемент с `<button>` на `<div role="button">` с keyboard-handler'ами и внутренней `<Button>` (TDD по поведенческим аспектам — keyboard и stopPropagation проверяются через DOM-рендер). Затем в `step-1-scenario.tsx` подменяем нативную кнопку «Все N сценариев» на shadcn `<Button>`. В конце вырезаем категории и связанный state из `scenario-catalog-modal.tsx` и подключаем `variant="catalog"` в карточки каталога. Каждая задача — атомарный коммит, после каждой `npm test` и `npm run lint` зелёные.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (`Button` на base-ui), vitest + @testing-library/react для DOM-юнит-тестов, motion/react (не используется в этом плане), Onest font.

**Spec:** `docs/superpowers/specs/2026-05-21-scenario-cards-catalog-design.md`
**Ветка/воркстри:** `feature/scenario-cards-in-catalog` / `.worktrees/scenario-cards-in-catalog`

---

## File Structure

**Create:**
- `src/sections/signals/scenario-card.test.tsx` — vitest + @testing-library/react тесты на поведение карточки (Enter/Space → onClick; click по внутренней кнопке вызывает onClick один раз; aria-pressed для selected).

**Modify:**
- `src/sections/signals/scenario-card.tsx` — добавить prop `variant: "compact" | "catalog"`, переделать корневой элемент на `<div role="button" tabIndex={0}>` c handlers `onClick`, `onKeyDown` (Enter/Space), добавить внутреннюю `<Button>` «Запустить сценарий» со `stopPropagation`, оба варианта рендерят кнопку; описание имеет `text-muted-foreground` (compact) или `text-foreground` (catalog); фон `bg-card` (compact) или `bg-[oklch(0.18_0.006_102)]` (catalog — темнее, чем `bg-popover` (~0.215) и тинтнут под хью 102°, без чистого `bg-background`).
- `src/sections/signals/steps/step-1-scenario.tsx` — заменить нативную `<button>` «Все N сценариев» на `<Button variant="outline" size="default">`; добавить `auto-rows-fr` на grid'ы, чтобы карточки выравнивались по высоте после появления внутренней кнопки.
- `src/sections/signals/scenario-catalog-modal.tsx` — удалить блок фильтр-чипсов категорий и связанный state (`activeCategories`, `toggleCategory`), удалить условие фильтрации по категории, передать `variant="catalog"` в `<ScenarioCard>`, удалить лишние импорты (`SCENARIO_CATEGORIES`, `ScenarioCategory`, `cn`), добавить `auto-rows-fr` для выравнивания высоты карточек.

**Not modified:**
- `src/data/scenarios.ts` — поле `category` остаётся в данных (типа), даже если UI его не показывает. Удаление отдельно при подтверждении (см. спеку §7).

---

## Task 0: Создать worktree

**Files:** none (setup)

- [ ] **Step 1: Создать worktree и ветку**

Run из корня репозитория (`/home/user/afina-ai-first`):

```bash
git worktree add .worktrees/scenario-cards-in-catalog -b feature/scenario-cards-in-catalog main
cd .worktrees/scenario-cards-in-catalog
npm install
```

- [ ] **Step 2: Убедиться, что baseline зелёный**

```bash
npm test
npm run lint
```

Expected: оба зелёные.

**Все последующие шаги выполняются внутри `.worktrees/scenario-cards-in-catalog/`.**

---

# ФАЗА 1 — ScenarioCard: вариант + внутренняя кнопка + keyboard

## Task 1: Тесты на новое поведение ScenarioCard (red)

**Files:**
- Create: `src/sections/signals/scenario-card.test.tsx`

- [ ] **Step 1: Создать failing-тесты**

Создать `src/sections/signals/scenario-card.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScenarioCard } from "./scenario-card";
import type { Scenario } from "@/data/scenarios";

const SCENARIO: Scenario = {
  id: "test-scenario",
  name: "Тест-сценарий",
  description: "Описание для теста.",
  category: "Привлечение",
  signalType: "Регистрация",
  isBase: true,
  isCurated: false,
};

describe("ScenarioCard — internal button", () => {
  it("renders 'Запустить сценарий' button in compact variant", () => {
    render(<ScenarioCard scenario={SCENARIO} onClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Запустить сценарий" })
    ).toBeInTheDocument();
  });

  it("renders 'Запустить сценарий' button in catalog variant", () => {
    render(
      <ScenarioCard scenario={SCENARIO} onClick={() => {}} variant="catalog" />
    );
    expect(
      screen.getByRole("button", { name: "Запустить сценарий" })
    ).toBeInTheDocument();
  });

  it("clicking internal button calls onClick exactly once (stopPropagation)", () => {
    const onClick = vi.fn();
    render(<ScenarioCard scenario={SCENARIO} onClick={onClick} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Запустить сценарий" })
    );
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith("test-scenario");
  });
});

describe("ScenarioCard — card-level click", () => {
  it("clicking the card surface calls onClick with scenario id", () => {
    const onClick = vi.fn();
    render(<ScenarioCard scenario={SCENARIO} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Тест-сценарий/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith("test-scenario");
  });
});

describe("ScenarioCard — keyboard support", () => {
  it("Enter on card triggers onClick", () => {
    const onClick = vi.fn();
    render(<ScenarioCard scenario={SCENARIO} onClick={onClick} />);
    const card = screen.getByRole("button", { name: /Тест-сценарий/i });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("test-scenario");
  });

  it("Space on card triggers onClick", () => {
    const onClick = vi.fn();
    render(<ScenarioCard scenario={SCENARIO} onClick={onClick} />);
    const card = screen.getByRole("button", { name: /Тест-сценарий/i });
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledWith("test-scenario");
  });

  it("other keys do not trigger onClick", () => {
    const onClick = vi.fn();
    render(<ScenarioCard scenario={SCENARIO} onClick={onClick} />);
    const card = screen.getByRole("button", { name: /Тест-сценарий/i });
    fireEvent.keyDown(card, { key: "Tab" });
    fireEvent.keyDown(card, { key: "a" });
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ScenarioCard — aria-pressed", () => {
  it("sets aria-pressed=true when selected", () => {
    render(<ScenarioCard scenario={SCENARIO} onClick={() => {}} selected />);
    const card = screen.getByRole("button", { name: /Тест-сценарий/i });
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("sets aria-pressed=false when not selected", () => {
    render(<ScenarioCard scenario={SCENARIO} onClick={() => {}} />);
    const card = screen.getByRole("button", { name: /Тест-сценарий/i });
    expect(card.getAttribute("aria-pressed")).toBe("false");
  });
});
```

- [ ] **Step 2: Запустить тесты — падают**

```bash
npm test -- scenario-card
```

Expected: FAIL — текущий `ScenarioCard` не содержит внутренней кнопки «Запустить сценарий» и не обрабатывает Enter/Space.

- [ ] **Step 3: Коммит red-теста**

```bash
git add src/sections/signals/scenario-card.test.tsx
git commit -m "test(scenario-card): add behavior tests for variant + keyboard + internal button"
```

---

## Task 2: Реализовать новое поведение ScenarioCard (green)

**Files:**
- Modify: `src/sections/signals/scenario-card.tsx`

- [ ] **Step 1: Заменить файл целиком**

Заменить содержимое `src/sections/signals/scenario-card.tsx` на:

```tsx
"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Scenario } from "@/data/scenarios";

interface ScenarioCardProps {
  scenario: Scenario;
  selected?: boolean;
  onClick: (id: string) => void;
  /**
   * compact — step-1 (текущий вид): описание приглушено, фон `bg-card`.
   * catalog — каталог сценариев: оба текста `text-foreground`, фон темнее.
   * default: "compact".
   */
  variant?: "compact" | "catalog";
}

export function ScenarioCard({
  scenario,
  selected = false,
  onClick,
  variant = "compact",
}: ScenarioCardProps) {
  function handleCardClick() {
    onClick(scenario.id);
  }

  function handleCardKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(scenario.id);
    }
  }

  function handleButtonClick(e: MouseEvent<HTMLButtonElement>) {
    // Stop the card-level click from also firing — otherwise onClick would
    // be invoked twice (button + bubbled card click).
    e.stopPropagation();
    onClick(scenario.id);
  }

  // Catalog variant: оба текста белые, фон темнее, чем bg-popover диалога.
  // 0.18 < bg-popover (~0.215) и тинтнут под хью 102° (warm dark) — никакого
  // голого bg-background, никакого жёлтого. Подбираем визуально при ревью.
  const catalogSurface = "bg-[oklch(0.18_0.006_102)]";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "flex h-full cursor-pointer flex-col items-start justify-between rounded-lg border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? "border-brand/50 bg-brand-muted"
          : variant === "catalog"
            ? cn("border-border", catalogSurface, "hover:border-border/80")
            : "border-border bg-card hover:bg-accent hover:border-border"
      )}
    >
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-foreground">
          {scenario.name}
        </span>
        <span
          className={cn(
            "mt-1 text-xs leading-relaxed",
            variant === "catalog" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {scenario.description}
        </span>
      </div>
      <Button
        variant="secondary"
        size="default"
        onClick={handleButtonClick}
        className="mt-3"
      >
        Запустить сценарий
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Запустить тесты — все зелёные**

```bash
npm test -- scenario-card
```

Expected: PASS — все 10 тестов проходят.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 4: Коммит**

```bash
git add src/sections/signals/scenario-card.tsx
git commit -m "feat(scenario-card): add variant prop, internal Run button, keyboard support"
```

---

# ФАЗА 2 — Step 1: унифицировать кнопку «Все N сценариев» + выровнять высоты

## Task 3: Заменить нативную кнопку и добавить auto-rows-fr

**Files:**
- Modify: `src/sections/signals/steps/step-1-scenario.tsx`

Эта задача — чисто визуальный refactor. Логика wizard не меняется. Unit-тесты не пишем, проверяем через dev-server в Task 5.

- [ ] **Step 1: Добавить импорт `Button` в шапку файла**

Найти в `src/sections/signals/steps/step-1-scenario.tsx` блок импортов:

```ts
import { ScenarioCard } from "@/sections/signals/scenario-card";
import {
  baseScenarios,
  curatedScenarios,
  getScenario,
  scenarioCount,
} from "@/data/scenarios";
```

Добавить **перед** этими строками:

```ts
import { Button } from "@/components/ui/button";
```

Итог — блок импортов выглядит так:

```ts
"use client";

import { useMemo } from "react";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { Button } from "@/components/ui/button";
import { ScenarioCard } from "@/sections/signals/scenario-card";
import {
  baseScenarios,
  curatedScenarios,
  getScenario,
  scenarioCount,
} from "@/data/scenarios";
```

- [ ] **Step 2: Заменить grid'ы на `auto-rows-fr` (выравнивание по высоте)**

Найти первый grid (в секции «Базовые сценарии»):

```tsx
          <div className="grid grid-cols-3 gap-3">
            {base.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                selected={visualScenario === s.id}
                onClick={handleSelect}
              />
            ))}
          </div>
```

Заменить на:

```tsx
          <div className="grid auto-rows-fr grid-cols-3 gap-3">
            {base.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                selected={visualScenario === s.id}
                onClick={handleSelect}
              />
            ))}
          </div>
```

Найти второй grid (в секции «Подобрано для вас»):

```tsx
          <div className="grid grid-cols-3 gap-3">
            {curatedDisplay.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                selected={visualScenario === s.id}
                onClick={handleSelect}
              />
            ))}
          </div>
```

Заменить на:

```tsx
          <div className="grid auto-rows-fr grid-cols-3 gap-3">
            {curatedDisplay.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                selected={visualScenario === s.id}
                onClick={handleSelect}
              />
            ))}
          </div>
```

- [ ] **Step 3: Заменить кнопку «Все N сценариев» на `<Button>`**

Найти нативную кнопку (в текущем файле строки 91-97):

```tsx
        <button
          type="button"
          onClick={handleOpenCatalog}
          className="self-start rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
        >
          Все {scenarioCount} сценариев →
        </button>
```

Заменить на:

```tsx
        <Button
          variant="outline"
          size="default"
          onClick={handleOpenCatalog}
          className="self-start"
        >
          Все {scenarioCount} сценариев →
        </Button>
```

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 5: Запустить тесты (не должно ничего сломаться)**

```bash
npm test
```

Expected: PASS — никаких регрессий, тесты `scenario-card` остаются зелёными.

- [ ] **Step 6: Коммит**

```bash
git add src/sections/signals/steps/step-1-scenario.tsx
git commit -m "feat(step-1): unify 'all scenarios' button size, equalize card heights"
```

---

# ФАЗА 3 — Каталог сценариев: убрать категории + variant="catalog"

## Task 4: Удалить категории и подключить catalog-вариант

**Files:**
- Modify: `src/sections/signals/scenario-catalog-modal.tsx`

Чисто визуально-структурный refactor. Логика выбора сценария не меняется. Smoke-проверка в Task 5.

- [ ] **Step 1: Заменить файл целиком**

Заменить содержимое `src/sections/signals/scenario-catalog-modal.tsx` на:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SCENARIOS, type Scenario } from "@/data/scenarios";
import { ScenarioCard } from "./scenario-card";

interface ScenarioCatalogModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (scenarioId: string) => void;
}

function matchesQuery(scenario: Scenario, q: string): boolean {
  if (!q) return true;
  return scenario.name.toLocaleLowerCase("ru-RU").includes(q);
}

export function ScenarioCatalogModal({
  open,
  onClose,
  onSelect,
}: ScenarioCatalogModalProps) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLocaleLowerCase("ru-RU");

  const filtered = useMemo(() => {
    return SCENARIOS.filter((s) => matchesQuery(s, normalized));
  }, [normalized]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl gap-5 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Каталог сценариев</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сценариям…"
            aria-label="Поиск по сценариям"
            className="pl-9"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ничего не найдено.
            </p>
          ) : (
            <div className="grid auto-rows-fr grid-cols-3 gap-3">
              {filtered.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  onClick={onSelect}
                  variant="catalog"
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Изменения относительно исходника:
- Удалены импорты `cn`, `SCENARIO_CATEGORIES`, `ScenarioCategory`.
- Удалён state `activeCategories`, функция `toggleCategory`, сброс в `handleOpenChange`.
- Удалена условная фильтрация по категории в `filtered`.
- Удалён весь блок `<div className="flex flex-wrap gap-2">…</div>` с фильтр-чипсами категорий.
- В `<ScenarioCard>` добавлен пропс `variant="catalog"`.
- В grid добавлено `auto-rows-fr` (выравнивание по высоте).

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: clean. Если линтер ругается на неиспользованные импорты — поправить (но в новой версии файла они уже удалены).

- [ ] **Step 3: Запустить тесты**

```bash
npm test
```

Expected: PASS. Тесты `scenario-card` остаются зелёными, тесты `scenarios` (в `src/data/scenarios.test.ts`) — нетронутые (тип `ScenarioCategory` и константа `SCENARIO_CATEGORIES` остались в `scenarios.ts`).

- [ ] **Step 4: Коммит**

```bash
git add src/sections/signals/scenario-catalog-modal.tsx
git commit -m "feat(catalog): remove category filters, switch cards to catalog variant"
```

---

# ФАЗА 4 — Финальная верификация

## Task 5: Smoke-проверка в dev-сервере

**Files:** none

- [ ] **Step 1: Полный прогон тестов и линта**

```bash
npm test
npm run lint
```

Expected: оба зелёные.

- [ ] **Step 2: Запустить dev-сервер на порту 3001**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
npm run dev -- -p 3001 > /tmp/scenario-cards-dev.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001
```

Expected: 200.

- [ ] **Step 3: Ручная проверка (acceptance из спеки §5)**

В браузере открыть `http://localhost:3001` и пройти матрицу:

| # | Действие | Ожидание |
|---|---|---|
| 1 | Открыть мастер «Создать сигнал», увидеть step-1 | Видны секции «Базовые сценарии» (6) + «Подобрано для вас» (≥4) + кнопка «Все 24 сценариев →» |
| 2 | Внутри каждой карточки на step-1 | Есть кнопка «Запустить сценарий» внизу |
| 3 | Кликнуть по карточке (вне внутренней кнопки) | Переход на step-2 с выбранным сценарием |
| 4 | Вернуться на step-1, кликнуть по кнопке «Запустить сценарий» внутри карточки | Тот же переход на step-2 (вызов один раз — никаких двойных переходов) |
| 5 | Tab по карточкам | Фокус ловится (есть focus-ring); Tab дальше — фокус на внутренней кнопке; Shift+Tab — обратно |
| 6 | На сфокусированной карточке нажать Enter | Переход на step-2 с выбранным сценарием |
| 7 | На сфокусированной карточке нажать Space | То же |
| 8 | Сравнить размер кнопки «Все 24 сценариев →» с кнопкой «Далее» на step-3 | Размеры визуально совпадают (h-8) |
| 9 | Кликнуть «Все 24 сценариев →» | Открывается каталог |
| 10 | В каталоге | НЕТ фильтр-чипсов категорий сверху (был блок «Привлечение / Онбординг / …») |
| 11 | В каталоге visualy compare карточек со step-1 | И название, и описание — белые (text-foreground); фон карточки темнее, чем фон диалога |
| 12 | В каталоге кликнуть по карточке или по её кнопке «Запустить сценарий» | Диалог закрывается, открывается step-2 с выбранным сценарием |
| 13 | Ввести что-то в поиск каталога | Список фильтруется по имени; пустой результат показывает «Ничего не найдено.» |
| 14 | На step-1 проверить выравнивание высоты карточек | Все карточки в одной строке одинаковой высоты, кнопка «Запустить сценарий» прижата к низу |

Если хотя бы один сценарий не работает — фиксить ДО коммита.

- [ ] **Step 4: Финальный коммит (если были hot-fix'ы)**

Если в Step 3 что-то правилось — закоммитить:

```bash
git add -A
git commit -m "fix(scenario-cards): <конкретное описание правки>"
```

- [ ] **Step 5: Остановить dev-сервер**

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; true
```

- [ ] **Step 6: Отчитаться о готовности**

Сообщить пользователю:
- Ветка: `feature/scenario-cards-in-catalog`
- Worktree: `.worktrees/scenario-cards-in-catalog`
- Количество коммитов на ветке: `git log --oneline main..HEAD | wc -l`
- Что осталось — мерж/PR (это решение пользователя, агент не мержит сам).
