/**
 * Кейсы экзамена оркестратора. Каждый кейс:
 *  - name: уникальное имя
 *  - request: { text, history?, context } — как клиент (см. assist-contract)
 *  - expect: проверки над results (см. scripts/run-evals.mjs):
 *      kinds        — точный массив kind'ов или массив допустимых вариантов (массив массивов)
 *      mustContain  — подстроки, обязанные быть в текстовых полях ответа
 *      mustNotContain — подстроки-запреты
 *      check        — (results) => string | null — null=ок, строка=описание провала
 *  - mustPass: true — провал валит exit code (поведенческие гарантии §7 спеки);
 *    false — информационный (счёт качества)
 */

// ---------------------------------------------------------------------------
// Контексты
// ---------------------------------------------------------------------------

/** Типичный workflowCtx: экран кампании, граф Сигнал→СМС→Задержка(1д)→Email→Успех + Конец */
const workflowCtx = {
  screen: "campaign-workflow",
  graph: {
    nodes: [
      { id: "signal", data: { label: "Сигнал", nodeType: "signal" } },
      { id: "sms1",   data: { label: "СМС",     nodeType: "sms" } },
      { id: "wait1",  data: { label: "Задержка", nodeType: "wait",  params: { duration: "1 день" } } },
      { id: "email1", data: { label: "Email",    nodeType: "email" } },
      { id: "succ",   data: { label: "Успех",    nodeType: "success", isSuccess: true } },
      { id: "end1",   data: { label: "Конец",    nodeType: "end" } },
    ],
    edges: [
      { id: "e1", source: "signal", target: "sms1" },
      { id: "e2", source: "sms1",   target: "wait1" },
      { id: "e3", source: "wait1",  target: "email1" },
      { id: "e4", source: "email1", target: "succ" },
      { id: "e5", source: "email1", target: "end1" },
    ],
  },
  dataSummary:
    'Кампаний: 2\n' +
    '- кампания "Ипотека-лето" (id c1): статус active, бюджет 50000 ₽\n' +
    '- кампания "Реактивация-база" (id c2): статус paused, бюджет 20000 ₽\n' +
    'Сигналов: 1\n' +
    '- сигнал "Ипотека" (id s1): тип Первая сделка, аудитория 1200, сегменты max 100 / high 300 / mid 500 / low 300\n' +
    'Статистика:\n' +
    '- всего: отправок 18400, кликов 2100, конверсий 312\n' +
    '- деньги: доход $4200, расход $1800\n' +
    '- кампания "Ипотека-лето": доход $2800, расход $900\n' +
    '- кампания "Реактивация-база": доход $600, расход $280',
};

/** statsCtx: экран статистики с двумя кампаниями */
const statsCtx = {
  screen: "section:Статистика",
  dataSummary:
    'Кампаний: 2\n' +
    '- кампания "Ипотека-лето" (id c1): статус active, бюджет 50000 ₽\n' +
    '- кампания "Реактивация-база" (id c2): статус paused, бюджет 20000 ₽\n' +
    'Сигналов: 1\n' +
    '- сигнал "Ипотека" (id s1): тип Первая сделка, аудитория 1200, сегменты max 100 / high 300 / mid 500 / low 300\n' +
    'Статистика:\n' +
    '- всего: отправок 18400, кликов 2100, конверсий 312\n' +
    '- деньги: доход $4200, расход $1800\n' +
    '- кампания "Ипотека-лето": доход $2800, расход $900\n' +
    '- кампания "Реактивация-база": доход $600, расход $280',
};

/** wizardCtx: шаг 2 визарда, активный триггер «Кредиты — банки» */
const wizardCtx = {
  screen: "guided-signal",
  wizardStep: { step: 2, title: "Интересы" },
  activeTrigger: { id: "credit-banks", label: "Кредиты — банки" },
  dataSummary:
    'Кампаний: 0\nСигналов: 0',
};

// ---------------------------------------------------------------------------
// Хелперы
// ---------------------------------------------------------------------------

function hasOpKind(results, kind) {
  const ops = results.flatMap((r) => r.ops ?? []);
  return ops.some((op) => op.kind === kind);
}

function countOpsOfKind(results, kind) {
  const ops = results.flatMap((r) => r.ops ?? []);
  return ops.filter((op) => op.kind === kind).length;
}

function hasNodeTypeInOps(results, nodeType) {
  const ops = results.flatMap((r) => r.ops ?? []);
  return ops.some((op) => op.nodeType === nodeType);
}

function countAddNodeType(results, nodeType) {
  const ops = results.flatMap((r) => r.ops ?? []);
  return ops.filter((op) => op.kind === "add" && op.nodeType === nodeType).length;
}

const GRAPH_KINDS = new Set(["workflow-ops", "node-params", "rebuild", "undo"]);
function hasGraphKind(results) {
  return results.some((r) => GRAPH_KINDS.has(r.kind));
}

// ---------------------------------------------------------------------------
// Кейсы
// ---------------------------------------------------------------------------

export const cases = [
  // ── 1. Удалить СМС — прямая формулировка ─────────────────────────────────
  {
    name: "remove-sms-direct",
    request: { text: "убери смс", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        if (!hasOpKind(results, "remove")) return "нет op kind=remove";
        return null;
      },
    },
    mustPass: true,
  },

  // ── 2. Удалить СМС — описательная формулировка ────────────────────────────
  {
    name: "remove-sms-descriptive",
    request: {
      text: "хочу чтобы сообщения не использовались в этой кампании",
      context: workflowCtx,
    },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        if (!hasOpKind(results, "remove")) return "нет op kind=remove";
        return null;
      },
    },
    mustPass: true,
  },

  // ── 3. Заменить СМС на Push ───────────────────────────────────────────────
  {
    name: "replace-sms-with-push",
    request: { text: "смс не надо, лучше пуш", context: workflowCtx },
    expect: {
      kinds: [["workflow-ops"]],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        const hasReplace = ops.some((op) => op.kind === "replace");
        const hasRemoveSms = ops.some(
          (op) => op.kind === "remove" && /смс|sms/i.test(JSON.stringify(op))
        );
        if (!hasReplace && !hasRemoveSms) return "ожидали replace СМС на push или remove sms";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 4. Три СМС подряд без пауз (суверенность: не добавлять wait) ─────────
  {
    name: "add-three-sms-no-wait",
    request: { text: "добавь три смс подряд без пауз", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const addSmsCount = countAddNodeType(results, "sms");
        if (addSmsCount !== 3) return `ожидали ровно 3 add sms, получили ${addSmsCount}`;
        const addWaitCount = countAddNodeType(results, "wait");
        if (addWaitCount > 0) return `модель самовольно добавила ${addWaitCount} wait — запрещено`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 5. Собрать прогрев холодной базы — неполный запрос, уточнение/rebuild
  {
    name: "build-cold-base-warmup",
    request: { text: "собери прогрев холодной базы", context: workflowCtx },
    expect: {
      kinds: [["clarify"], ["rebuild"]],
      check: (results) => {
        const first = results[0];
        if (first.kind === "clarify") {
          if (!first.questions || first.questions.length > 2)
            return `clarify должен иметь 1–2 вопроса, получили ${first.questions?.length ?? 0}`;
        }
        return null;
      },
    },
    mustPass: true,
  },

  // ── 6. Rebuild после уточнений (с историей) ───────────────────────────────
  {
    name: "rebuild-after-clarify",
    request: {
      text: "цель — первая покупка, каналы пуш и почта, неделя, 3 касания",
      history: [
        {
          role: "user",
          content: "собери прогрев холодной базы",
        },
        {
          role: "assistant",
          content:
            "Уточните: какая цель конверсии и какие каналы предпочтительны?",
        },
      ],
      context: workflowCtx,
    },
    expect: {
      kinds: ["rebuild"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "rebuild") return "ожидали rebuild";
        const spec = r.spec;
        if (!spec) return "нет spec в rebuild";
        const nodeTypes = (spec.nodes ?? []).map((n) => n.type ?? n.nodeType ?? "");
        const hasSuccess = nodeTypes.some((t) => /success/i.test(t));
        const hasEnd = nodeTypes.some((t) => /end|конец/i.test(t));
        if (!hasSuccess && !hasEnd) return "в spec нет success/end нод";
        if (!spec.assumptions || spec.assumptions.length < 10)
          return `assumptions слишком короткий: ${spec.assumptions?.length ?? 0} симв.`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 7. Вопрос про Яндекс.Директ — честный отказ ──────────────────────────
  {
    name: "yandex-direct-out-of-scope",
    request: { text: "как настроить рекламу в Яндекс.Директе?", context: statsCtx },
    expect: {
      kinds: ["answer"],
      check: (results) => {
        const text = (results[0]?.text ?? "").toLowerCase();
        if (!/нет|не умеет|не подключ|пока не/i.test(text))
          return `ожидали честный отказ (нет/не подключ/пока не), получили: ${text.slice(0, 80)}`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 8. Экспорт в Excel — честный отказ ───────────────────────────────────
  {
    name: "export-excel-out-of-scope",
    request: { text: "где кнопка экспорта в эксель?", context: statsCtx },
    expect: {
      kinds: ["answer"],
      check: (results) => {
        const text = (results[0]?.text ?? "").toLowerCase();
        // Афина умеет экспорт CSV, но Excel — нет; должна сказать «нет» или «csv»
        if (!/нет|не|csv|нет такой/i.test(text))
          return `ожидали честный ответ о ограничениях, получили: ${text.slice(0, 80)}`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 9. Какая кампания принесла больше всего? ──────────────────────────────
  {
    name: "top-campaign-by-income",
    request: { text: "какая кампания принесла больше всего?", context: statsCtx },
    expect: {
      kinds: ["answer"],
      mustContain: ["Ипотека-лето"],
      check: (results) => {
        if (results[0]?.kind !== "answer") return "ожидали answer";
        return null;
      },
    },
    mustPass: true,
  },

  // ── 10. Уточнение бюджета кампании (с историей про Ипотека-лето) ──────────
  {
    name: "campaign-budget-with-history",
    request: {
      text: "а какой у неё бюджет?",
      history: [
        { role: "user", content: "какая кампания принесла больше всего?" },
        {
          role: "assistant",
          content: "Наибольший доход принесла кампания «Ипотека-лето» — $2800.",
        },
      ],
      context: statsCtx,
    },
    expect: {
      kinds: ["answer"],
      mustContain: ["50"],
      check: (results) => {
        if (results[0]?.kind !== "answer") return "ожидали answer";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 11. Разбивка по каналам, сортировка по расходу ────────────────────────
  {
    name: "breakdown-channels-sort-expenses",
    request: {
      text: "покажи по каналам за май, отсортируй по расходу",
      context: statsCtx,
    },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        const patch = r.patch;
        if (!patch) return "нет patch в stats";
        if (patch.rows !== "channels")
          return `patch.rows должен быть "channels", получили "${patch.rows}"`;
        const sortCol = patch.sort?.column ?? patch.sortColumn;
        if (!sortCol || !/расход|expense/i.test(sortCol))
          return `ожидали сортировку по расходу, получили: ${sortCol}`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 12. Navigate + stats: открой статистику и разбей по креативам ─────────
  {
    name: "navigate-to-stats-then-breakdown",
    request: {
      text: "открой статистику и разбей по креативам",
      context: { screen: "section:Сигналы", dataSummary: statsCtx.dataSummary },
    },
    expect: {
      kinds: [["navigate", "stats"], ["stats"]],
      check: (results) => {
        const hasStats = results.some((r) => r.kind === "stats");
        if (!hasStats) return "нет stats в результатах";
        const statsResult = results.find((r) => r.kind === "stats");
        if (statsResult && statsResult.patch?.rows && !/creativ/i.test(statsResult.patch.rows)) {
          // kreativy — допустимо если модель понимает «по креативам»
        }
        return null;
      },
    },
    mustPass: false,
  },

  // ── 13. Открой кампанию по ипотеке ───────────────────────────────────────
  {
    name: "navigate-to-campaign-ipoteka",
    request: { text: "открой кампанию по ипотеке", context: statsCtx },
    expect: {
      kinds: ["navigate"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "navigate") return "ожидали navigate";
        const target = r.target ?? "";
        if (!/(c1|ипотека)/i.test(target))
          return `target должен указывать на c1/Ипотека-лето, получили: ${target}`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 14. Нерелевантный запрос (фиолетовый трактор) ─────────────────────────
  {
    name: "irrelevant-purple-tractor",
    request: { text: "фиолетовый трактор в небе", context: workflowCtx },
    expect: {
      kinds: [["answer"], ["clarify"]],
      check: (results) => {
        if (hasGraphKind(results))
          return "модель сделала граф-операцию по бессмысленному запросу — запрещено";
        return null;
      },
    },
    mustPass: true,
  },

  // ── 15. Исключить sberbank.ru и добавить cian.ru (wizardCtx) ─────────────
  {
    name: "triggers-exclude-add",
    request: {
      text: "исключи sberbank.ru и добавь cian.ru",
      context: wizardCtx,
    },
    expect: {
      kinds: ["triggers"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "triggers") return "ожидали triggers";
        const excl = r.exclude ?? [];
        const add = r.add ?? [];
        if (!excl.some((d) => /sberbank/i.test(d)))
          return `sberbank.ru не в exclude: ${JSON.stringify(excl)}`;
        if (!add.some((d) => /cian/i.test(d)))
          return `cian.ru не в add: ${JSON.stringify(add)}`;
        return null;
      },
    },
    mustPass: true,
  },

  // ── 16–18. Перефразировки add (structural-commands) ───────────────────────
  {
    name: "add-email-after-sms-rephrase1",
    request: { text: "вставь email после смс", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        if (!ops.some((op) => op.kind === "add" && op.nodeType === "email"))
          return "нет add email";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "add-push-before-success-rephrase",
    request: { text: "добавь пуш перед успех", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        if (!ops.some((op) => op.kind === "add" && op.nodeType === "push"))
          return "нет add push";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "add-wait-between-sms-email",
    request: { text: "добавь задержку между смс и email", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        if (!ops.some((op) => op.kind === "add" && op.nodeType === "wait"))
          return "нет add wait";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 19–21. Перефразировки remove ─────────────────────────────────────────
  {
    name: "remove-email-rephrase",
    request: { text: "удали email", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        if (!hasOpKind(results, "remove")) return "нет op kind=remove";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "remove-wait-rephrase",
    request: { text: "убери задержку", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        if (!hasOpKind(results, "remove")) return "нет op kind=remove";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "remove-sms-english-rephrase",
    request: { text: "убери sms", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        if (!hasOpKind(results, "remove")) return "нет op kind=remove";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 22–24. Перефразировки replace ────────────────────────────────────────
  {
    name: "replace-sms-with-email",
    request: { text: "замени смс на email", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        if (!ops.some((op) => op.kind === "replace"))
          return "нет op kind=replace";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "replace-email-with-push",
    request: { text: "замени email на пуш", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        if (!ops.some((op) => op.kind === "replace"))
          return "нет op kind=replace";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "replace-wait-with-longer-rephrase",
    request: { text: "замени задержку на паузу 3 дня", context: workflowCtx },
    expect: {
      kinds: ["workflow-ops"],
      check: (results) => {
        const ops = results.flatMap((r) => r.ops ?? []);
        const hasReplaceOrAdd = ops.some((op) =>
          op.kind === "replace" || (op.kind === "add" && op.nodeType === "wait")
        );
        if (!hasReplaceOrAdd) return "нет replace или add wait";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 25–30. Stats-запросы из матчера с перефразировками ───────────────────
  {
    name: "stats-group-by-campaigns",
    request: { text: "сгруппируй по кампаниям", context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        const patch = r.patch;
        if (!patch) return "нет patch";
        if (patch.rows !== "campaigns")
          return `patch.rows должен быть "campaigns", получили "${patch.rows}"`;
        return null;
      },
    },
    mustPass: true,
  },
  {
    name: "stats-top-by-conversion",
    request: { text: "топ по конверсии", context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        if (!r.patch) return "нет patch";
        return null;
      },
    },
    mustPass: true,
  },
  {
    name: "stats-best-days-by-income",
    request: { text: "лучшие дни по доходу", context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        const patch = r.patch;
        if (!patch) return "нет patch";
        // Должны быть дни или доход
        const rowsOk = !patch.rows || /day|день|дням/i.test(patch.rows);
        if (!rowsOk) return `неожиданный rows для лучших дней: ${patch.rows}`;
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "stats-trend-by-days",
    request: { text: "тренд по дням", context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        if (!r.patch) return "нет patch";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "stats-breakdown-by-channels",
    request: { text: "разбивка по каналам", context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        const patch = r.patch;
        if (!patch) return "нет patch";
        if (patch.rows !== "channels")
          return `patch.rows должен быть "channels", получили "${patch.rows}"`;
        return null;
      },
    },
    mustPass: true,
  },
  {
    name: "stats-compare-channels-efficiency",
    request: { text: "сравни эффективность каналов", context: statsCtx },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        if (!r.patch) return "нет patch";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 31–34. Продуктовые вопросы из informational-replies ──────────────────
  {
    name: "info-what-is-signal",
    request: { text: "что такое сигналы", context: { screen: "section:Сигналы", dataSummary: "" } },
    expect: {
      kinds: ["answer"],
      mustContain: ["сегмент"],
      check: (results) => {
        if (results[0]?.kind !== "answer") return "ожидали answer";
        const text = results[0]?.text ?? "";
        if (!text) return "пустой text в answer";
        return null;
      },
    },
    mustPass: true,
  },
  {
    name: "info-what-is-trigger",
    request: {
      text: "что такое триггер и чем он отличается от интереса?",
      context: { screen: "guided-signal", dataSummary: "" },
    },
    expect: {
      kinds: ["answer"],
      mustContain: ["событие"],
      check: (results) => {
        if (results[0]?.kind !== "answer") return "ожидали answer";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "info-how-split-works",
    request: {
      text: "как работает разделение аудитории",
      context: { screen: "campaign-workflow", dataSummary: "" },
    },
    expect: {
      kinds: ["answer"],
      mustContain: ["ветк"],
      check: (results) => {
        if (results[0]?.kind !== "answer") return "ожидали answer";
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "info-campaign-structure",
    request: {
      text: "как устроены кампании в Афине",
      context: { screen: "section:Кампании", dataSummary: "" },
    },
    expect: {
      kinds: ["answer"],
      mustContain: ["сигнал"],
      check: (results) => {
        if (results[0]?.kind !== "answer") return "ожидали answer";
        return null;
      },
    },
    mustPass: false,
  },

  // ── 35–37. Clear-триггеров ────────────────────────────────────────────────
  {
    name: "triggers-clear-added",
    request: {
      text: "убери всё что я добавлял",
      context: wizardCtx,
    },
    expect: {
      kinds: ["triggers"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "triggers") return "ожидали triggers";
        if (!r.clearAdded)
          return "ожидали clearAdded=true, получили: " + JSON.stringify(r);
        return null;
      },
    },
    mustPass: true,
  },
  {
    name: "triggers-clear-added-rephrase",
    request: {
      text: "удали всё что я добавлял из доменов",
      context: wizardCtx,
    },
    expect: {
      kinds: ["triggers"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "triggers") return "ожидали triggers";
        if (!r.clearAdded)
          return "ожидали clearAdded, получили: " + JSON.stringify(r);
        return null;
      },
    },
    mustPass: false,
  },
  {
    name: "triggers-clear-excluded",
    request: {
      text: "верни всё что я исключал",
      context: wizardCtx,
    },
    expect: {
      kinds: ["triggers"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "triggers") return "ожидали triggers";
        if (!r.clearExcluded)
          return "ожидали clearExcluded=true, получили: " + JSON.stringify(r);
        return null;
      },
    },
    mustPass: false,
  },

  // ── 38. Добавить домены через triggers в wizard ───────────────────────────
  {
    name: "triggers-add-domains-wizard",
    request: {
      text: "добавь domainX.ru и domainY.com",
      context: wizardCtx,
    },
    expect: {
      kinds: ["triggers"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "triggers") return "ожидали triggers";
        const add = r.add ?? [];
        if (!add.some((d) => /domainx/i.test(d)))
          return `domainX.ru не в add: ${JSON.stringify(add)}`;
        if (!add.some((d) => /domainy/i.test(d)))
          return `domainY.com не в add: ${JSON.stringify(add)}`;
        return null;
      },
    },
    mustPass: false,
  },

  // ── 39. Undo (если есть undo в контексте) ────────────────────────────────
  {
    name: "undo-last-action",
    request: {
      text: "отмени последнее действие",
      context: { ...workflowCtx, undoAvailable: true },
    },
    expect: {
      kinds: [["undo"], ["workflow-ops"]],
      check: (results) => {
        const kinds = results.map((r) => r.kind);
        if (!kinds.some((k) => k === "undo" || k === "workflow-ops"))
          return `ожидали undo или workflow-ops, получили ${JSON.stringify(kinds)}`;
        return null;
      },
    },
    mustPass: false,
  },

  // ── 40. Топ кампаний по доходу в июне (stats matcher, specialization) ──────
  {
    name: "stats-top-campaigns-income-june",
    request: {
      text: "топ кампаний по доходу за июнь",
      context: statsCtx,
    },
    expect: {
      kinds: ["stats"],
      check: (results) => {
        const r = results[0];
        if (r.kind !== "stats") return "ожидали stats";
        if (!r.patch) return "нет patch";
        return null;
      },
    },
    mustPass: false,
  },
];
