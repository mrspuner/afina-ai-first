# Plan 003: Живая статистика — метрики кампаний растут на глазах во время сессии

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2d9f2c7..HEAD -- src/sections/statistics/fact-cube.ts src/sections/statistics/fact-cube.test.ts src/sections/statistics/statistics-view.tsx src/state/metrics.ts src/state/metrics.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED (детерминированный куб остаётся детерминированным; риск — монотонность чисел и лишние пересчёты)
- **Depends on**: none (независим от 001/002)
- **Category**: direction
- **Planned at**: commit `2d9f2c7`, 2026-06-11

## Why this matters

PRODUCT.md обещает цикл «запустил кампанию → слежу за результатами», но сейчас цифры статистики в пределах сессии мертвы: куб фактов детерминирован по дням, и за 30-минутное пользовательское тестирование ни одно число не изменится. Для прототипа, который валидирует UX на живых пользователях, «дышащая» статистика — разница между «вижу, что кампания работает» и «вижу красивый, но статичный отчёт». Идея: сегодняшние факты масштабируются долей прошедшего дня и пересчитываются раз в N секунд — числа монотонно растут в течение сессии, прошлые дни не меняются, детерминизм и свойство «подстроки сходятся к родителю» сохраняются.

## Current state

Пайплайн данных статистики (всё — мок, бэкенда нет):

- `src/sections/statistics/fact-cube.ts` — OLAP-куб: детерминированные факты `кампания × активный день × канал` из реальных запущенных кампаний. Из шапки файла: «sub-rows always sum to their parent row; the grand total is identical no matter which dimension you group by» — это инвариант, его нельзя ломать.
  - `campaignWindow(c, now)` (строки 211-218): окно активности; для active-кампании конец = `now` («up to today, never the future»).
  - `buildFacts(ctx, period, opts { now? })` (строка 358): `now = opts.now ?? new Date()`; кэш по ключу, **уже включающему `now.getTime()`** (строки 342-350) — тикающий `now` корректно инвалидирует кэш без доработок.
  - `buildCampaignFacts(c, signalCount, days)`: раздаёт `campaignBaseSends` по ячейкам день×канал взвешенно (`distribute(base, weights)`), затем на ячейку: `computeFunnel(metricRng, sends)`. Сейчас **не знает про `now`** — сегодняшний день получает полную дневную порцию сразу.
- `src/state/metrics.ts` — числа воронки:
  - `FunnelNumbers` (строка 143): `{ sends, clicks, actions, holds, approves, rejects, expensesUsd, incomeUsd }` — все поля аддитивные; ставки (AR/RR) выводятся позже из агрегата.
  - `computeFunnel(rng, baseSends)` (строки 205-217): деривация от sends; **важно** — `expensesUsd = 300 + rng() * 5000` и `incomeUsd` НЕ пропорциональны sends. Поэтому масштабировать надо готовую воронку целиком, а не вход `baseSends`, иначе деньги не будут расти.
  - `addFunnel(a, b)` (строка 220) — образец пополевой операции.
- `src/sections/statistics/statistics-view.tsx` (строки 181-184) — единственное место сборки строк:

```ts
const rows = useMemo(
  () => generateRows(applied, { campaigns, signals }),
  [applied, campaigns, signals],
);
```

  `generateRows(filters, ctx, opts { now? })` (`src/sections/statistics/mock-data.ts`) — `now` уже пробрасывается в `buildFacts`, но из вьюхи не передаётся.
- Тесты-образцы: `src/sections/statistics/fact-cube.test.ts`, `src/state/metrics.test.ts` — детерминированные, с фиксированными датами. Новые тесты писать в их стиле.
- Хуки живут в `src/hooks/` (`use-typewriter.ts`, `use-view-history.ts`) — туда же новый.
- E2E по статистике проверяет только заголовки/видимость (проверено: `tests/e2e/*.spec.ts` не ассертят чисел) — масштабирование сегодняшних чисел тесты не сломает.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm test` | 48+ файлов, 625+ тестов зелёные |
| Targeted | `npm test -- fact-cube` / `npm test -- metrics` | зелёные |
| Lint | `npm run lint` | НЕ gate (19 ошибок уже на `2d9f2c7`); gate: нет новых |
| E2E | `npm run test:e2e` | все спеки зелёные |

## Scope

**In scope:**
- `src/state/metrics.ts` (+`scaleFunnel`), `src/state/metrics.test.ts`
- `src/sections/statistics/fact-cube.ts` (внутридневная доля для сегодняшних фактов)
- `src/sections/statistics/fact-cube.test.ts`
- `src/hooks/use-now-tick.ts` (создать)
- `src/sections/statistics/statistics-view.tsx` (тик + проброс `now`)

**Out of scope (НЕ трогать):**
- `src/sections/statistics/mock-data.ts` — `generateRows` уже принимает `opts.now`, правок не требует.
- `src/state/app-state.ts`, тип Campaign — метрики НЕ переносятся в стейт; куб остаётся единственным источником цифр (вариант «диспатчить инкременты метрик в app-state» отвергнут: дублирует источник истины и ломает инвариант сходимости куба).
- Сводки/карточки кампаний вне раздела Статистика — сознательно потом (см. Maintenance notes).
- `period-utils.ts`, фильтры, шаблоны отчётов.

## Git workflow

```bash
git worktree add .worktrees/live-statistics -b feature/live-statistics main
cd .worktrees/live-statistics && npm install
```

Conventional commits с русским описанием (`feat(stats): ...`). Не пушить в main. Dev-сервер — порт 3001 (3000 занят основным чекаутом, не убивать).

## Steps

### Step 1: `scaleFunnel` в metrics.ts

Добавить в `src/state/metrics.ts` (рядом с `addFunnel`, в том же стиле):

```ts
/** Масштабирует воронку долей прошедшего дня (0..1). Аддитивные поля
 *  округляются вниз — чтобы рост по мере увеличения доли был монотонным. */
export function scaleFunnel(n: FunnelNumbers, fraction: number): FunnelNumbers
```

Поведение: `fraction` клампится в [0, 1]; целочисленные поля (`sends, clicks, actions, holds, approves, rejects`) — `Math.floor(value * f)`; денежные (`expensesUsd, incomeUsd`) — просто `value * f`. После флора пересчитать `rejects = max(0, actions - holds - approves)`, чтобы не разъезжался внутренний баланс (см. как его строит `computeFunnel`, строки 209-211).

Тесты в `src/state/metrics.test.ts`: `f=1` — без изменений; `f=0` — нули; монотонность (для f1 < f2 каждое поле при f1 ≤ при f2); инвариант `rejects = actions - holds - approves` после скейла; кламп f>1 и f<0.

**Verify**: `npm test -- metrics` → зелёные, включая новые; `npx tsc --noEmit` → exit 0.

### Step 2: Внутридневная доля в fact-cube

В `src/sections/statistics/fact-cube.ts`:

1. Локальный хелпер `intradayFraction(now: Date): number` — `(now - startOfDay(now)) / 86_400_000`, клампнутый в `[0.02, 1]` (нижний порог 0.02 — чтобы утреннее демо не показывало нули).
2. Пробросить `now` из `buildFacts` в `buildCampaignFacts(c, signalCount, days, now)`.
3. В цикле создания фактов: если `dayKey` ячейки совпадает с днём `now` (сравнение по `toISOString().slice(0, 10)` — так уже делает существующий код), итоговую воронку факта прогнать через `scaleFunnel(funnel, intradayFraction(now))`. Прошлые дни — без изменений.

Кэш менять не нужно (ключ уже содержит `now.getTime()`).

Тесты в `fact-cube.test.ts` (стиль существующих, все даты фиксированные):
- Для активной кампании сумма `sends` фактов за «сегодня» при `now = 09:00` строго меньше, чем при `now = 21:00`, и обе ≤ суммы при `now = 23:59:59`.
- Факты за прошлый день идентичны при разных времени суток `now`.
- Монотонность: для серии из 5 возрастающих `now` в пределах дня суммарные `sends`/`incomeUsd` за сегодня не убывают.
- Инвариант сходимости: подстроки суммируются в родителя и при отскейленном «сегодня» (если такой тест уже есть для обычного дня — добавить вариант с `now` в середине дня).

**Verify**: `npm test -- fact-cube` → зелёные; `npm test` → весь набор зелёный.

### Step 3: Хук тика

`src/hooks/use-now-tick.ts`: `export function useNowTick(intervalMs = 15_000): Date` — `useState(() => new Date())` + `useEffect` с `setInterval`, очистка по анмаунту. Комментарий в стиле репо (русский, «почему»): тик кормит внутридневную долю куба, 15с — компромисс между «живостью» и пересчётом куба.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Подключить в statistics-view

В `statistics-view.tsx`: `const now = useNowTick();` рядом с прочими хуками (ПЕРЕД ранними return — в файле есть пометка про rules of hooks, строки ~136-141). Заменить мемо строк:

```ts
const rows = useMemo(
  () => generateRows(applied, { campaigns, signals }, { now }),
  [applied, campaigns, signals, now],
);
```

Больше ничего в файле не менять.

**Verify**: `npx tsc --noEmit` → exit 0; `npm test` → зелёные.

### Step 5: Ручная проверка + полная верификация

Dev-сервер на 3001; нужна хотя бы одна запущенная кампания (быстрый путь — дев-шорткаты из e2e, см. `tests/e2e/happy-path.spec.ts`, либо пройти флоу руками). Открыть Статистику, период «сегодня»/текущий, подождать 2–3 тика (30–45с): числа сегодняшнего дня выросли хотя бы раз, без скачков вниз; сортировки/фильтры работают; вкладка не подлагивает на тике (если лагает — см. STOP).

**Verify**: рост воспроизведён; `npm run test:e2e` → все зелёные; `npm run lint` → нет новых ошибок.

## Test plan

- `metrics.test.ts`: 5 кейсов `scaleFunnel` (шаг 1).
- `fact-cube.test.ts`: 4 кейса внутридневной доли (шаг 2), образец — существующие тесты файла; все «now» фиксированы, никаких `new Date()` без аргументов в тестах.
- E2E: без изменений, весь набор зелёный (числа в спеках не ассертятся — проверено при планировании).

## Done criteria

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm test` exit 0; новые тесты `scaleFunnel` и внутридневной доли существуют и проходят
- [ ] `npm run test:e2e` exit 0
- [ ] `grep -n "useNowTick" src/sections/statistics/statistics-view.tsx` → 1+ совпадение; `grep -rn "setInterval" src/sections/statistics/` → пусто (тик живёт только в хуке)
- [ ] `git status` — только in-scope файлы
- [ ] Строка плана в `plans/README.md` обновлена

## STOP conditions

Остановиться и доложить, если:

- Код по адресам из "Current state" не совпадает с выдержками.
- Существующие тесты `fact-cube.test.ts` падают из-за масштабирования «сегодня» так, что фикс требует менять их ожидания по ПРОШЛЫМ дням (значит, доля протекла не туда).
- На тике заметен лаг UI (куб пересчитывается слишком дорого при длинном периоде) — не оптимизировать самостоятельно, доложить с измерением (количество фактов, время `generateRows`).
- Выясняется, что числа «сегодня» показываются ещё где-то вне статистики (сводка кампании и т.п.) и расходятся с отчётом — зафиксировать места, не расширять scope.

## Maintenance notes

- Нижний порог `intradayFraction` (0.02) и интервал тика (15с) — продуктовые ручки; при желании вынести в `dev-config.ts` (паттерн `afina.dev.*`) отдельным мелким PR.
- Если карточки кампаний начнут показывать живые метрики — брать их из того же куба (`buildFacts`/`generateRows`), не дублировать источник.
- plans/002 (реальный AI): запросы «как дела у кампании?» смогут отвечать от тех же тикающих цифр — ничего дополнительно синхронизировать не нужно.
- Ревьюеру смотреть: монотонность (числа не должны «дёргаться» вниз между тиками) и неизменность прошлых дней.
