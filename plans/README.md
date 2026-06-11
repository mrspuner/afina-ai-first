# Implementation Plans

Сгенерировано скиллом improve 2026-06-11 на коммите `2d9f2c7` (аудит: standard, весь репозиторий). Выполнять в порядке ниже, если зависимости не говорят иного. Каждому исполнителю: прочитать план целиком до старта, чтить его STOP conditions, по завершении обновить свою строку статуса.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Устранить гонки в AI-цикле графа воркфлоу | P1 | S–M | — | DONE (commit `1486294`, ветка `feat/plans-001-003`; unit ✓, e2e и ручной чек — pending, env) |
| 002 | Спайк: реальный AI парсит команды графа (вертикальный срез) | P1 | L | 001 | DONE (commit `29d739b`; `gemini-2.5-flash` через `@ai-sdk/google`, флаг off; no-key→503 ✓; live-вызов — pending, нужен ключ) |
| 003 | Живая статистика — метрики растут в течение сессии | P2 | M | — | DONE (commit `0294f4e`; unit ✓, +9 тестов; ручной чек — pending, env) |
| 004 | Оркестратор `/api/ai/assist`: знания, answer, clarify | P1 | L | 001–003 | DONE (commit `cba1651`; unit ✓ (12 новых тестов в 004-T1..T2: afina-knowledge 3 + assist-contract 4 + data-summary 3 + orchestrator-prompt 2), live-проверка ✓ через curl (ключ оператора); e2e — pending, port 3000 held by main checkout) |
| 005 | Инструменты графа: ops с контекстом, rebuild, params, откат | P1 | L | 004 | TODO |
| 006 | configure_stats, navigate, edit_triggers, составные просьбы | P1 | M–L | 005 | TODO |
| 007 | Экзамен (evals), журнал aiLog, доки, поглощение спайка | P1 | M–L | 006 | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (с причиной в одну строку) | REJECTED (с обоснованием).

## Dependency notes

- **002 требует 001**: реальный AI делает задержку применения команд сетевой и непредсказуемой — гонки «снапшот затирает ручные правки» и «осиротевшее pending-сообщение» из 001 станут регулярными. 001 переводит применение на `apply(prev)` — единственно корректную точку для асинхронных команд.
- **003 независим** от 001/002 — другой слой (куб статистики).
- Все планы исполняются в отдельных git worktree (см. AGENTS.md); 001 и 002 трогают пересекающиеся файлы (`prompt-composer.tsx` — только 002; `workflow-view.tsx` — только 001), но мерджить их лучше последовательно: 001 → 002.
- **Серия 004–007 строго последовательна** (004 → 005 → 006 → 007) и исполняется в одном ворктри `.worktrees/plans-001-003` на ветке `feat/plans-001-003`: каждый план расширяет оркестратор предыдущего (контракт `assist-contract.ts`, route handler, ветки исполнения). Спека серии — `docs/superpowers/specs/2026-06-11-ai-orchestrator-design.md`; решения оператора не переоткрывать, они в §17 спеки.
- **004–007 vs параллельные ворктри других задач**: серия трогает `use-chat-submit.ts`, `prompt-composer.tsx`, `app-state.ts` (insertion point), `workflow-view.tsx`, `dev-panel.tsx` — параллельную работу в этих файлах не запускать до мерджа серии.

## Findings considered and rejected / deferred

Чтобы следующий аудит не предлагал заново:

**Отложено решением мейнтейнера (2026-06-11) — «гигиена, не нужна прототипу»; вернуться перед любым продакшн-пушем:**
- **Мёртвый вендоренный кит ai-elements**: ~35 из 41 файлов `src/components/ai-elements/` (~10K строк) не импортируются нигде; вместе с ними не нужны deps `shiki`, `streamdown` + 3×`@streamdown/*`, `media-chrome`, `@rive-app/react-webgl2`, `embla-carousel-react`, `ansi-to-react`, `react-jsx-parser`, `tokenlens`, а также `@ai-sdk/openai` (план 002 выбрал провайдером `@ai-sdk/google`). Живые 6 файлов: prompt-input, chip-editable-input, controls, reasoning, shimmer, suggestion (внутренние связи: reasoning→shimmer, chip-editable→prompt-input). Удаление чинит ~11 из 19 lint-ошибок и большую часть npm audit.
- **npm audit (18 уязвимостей, 8 high)**: большинство — в поддеревьях мёртвых deps (см. выше); остаток — CVE `next@16.2.2`, закрываются патч-бампом в пределах 16.x. Клиентский прототип без бэкенда — практическая эксплуатируемость ~нулевая.
- **Lint красный + нет CI**: 7 ошибок — скрипты `.claude/` (добавить в ignores ESLint), ~11 — мёртвый код, **2 настоящие в живом коде**: `src/components/ai-elements/shimmer.tsx:51` (создание компонента в рендере), `src/sections/signals/guided-signal-section.tsx:237` (sync setState в эффекте). Эти две стоит поправить drive-by при ближайшей работе в файлах.
- **Характеризационные тесты на горячие вьюхи** (`workflow-view`, `welcome-view`, `statistics-view` — самые редактируемые файлы без тестов) — не выбраны; 001 частично компенсирует выносом чистых функций под юнит-тесты.
- **README — бойлерплейт create-next-app**: реальная документация в PRODUCT.md / AGENTS.md / docs/.

**Отклонено по существу (не делать):**
- *Reducer без `default:` в `app-state.ts`*: `tsconfig` strict — неисчерпывающий switch с типом возврата `AppState` не скомпилируется; компилятор уже охраняет. Не баг.
- *«Добавить `graph` в deps командных эффектов workflow-view»*: eslint-disable там намеренные (эффект = обработчик прихода команды); предложенный «фикс» повторно применял бы команды. Реальная проблема уже — план 001.
- *`useMemo` строк статистики пересчитывается при изменении campaigns/signals*: это требование корректности, не перф-баг.
- *E2E проверяют только видимость*: приемлемый smoke для прототипа; переделка — L-усилие ради малого.
- *Разбить 1133-строчный `app-state.ts` на под-редьюсеры*: в файле осознанная конвенция `PARALLEL-WORKTREE INSERTION POINT` для бесконфликтных мерджей; вернуться, если конфликты реально начнут болеть.
- *`innerHTML = iconSvg` в `chip-editable-input.tsx:556`*: вход ограничен enum'ом `WorkflowNodeType` → известная карта иконок; не эксплуатируемо. Поправить drive-by при работе в файле.
- *Направление «оживить NL-редактирование воркфлоу с нуля»* (из аудита): уже существует — `structural-commands.ts` → `prompt-composer` → `workflow-view#applyOps`; правильная следующая ступень — план 002.
- *Husky / `.env.example` / переезд dev-ручек в env*: localStorage-ручки `dev-config.ts` — осознанный паттерн прототипа; `.env.example` появится в 002, где впервые возникает настоящий env var.
