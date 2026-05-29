/**
 * Подсказки для разделов главной навигации. У каждого раздела свой sub-тип
 * scope, который вычисляется селектором из AppState и определяет, какой набор
 * чипов отдаётся реестром. Состояния не дублируют контент — пересечения по
 * label исключаются.
 */

import type {
  CampaignsSub,
  SectionSub,
  SettingsSub,
  SignalsSub,
  StatisticsSub,
  SuggestionItem,
} from "./types";
import type { CampaignStatus } from "@/state/app-state";

function ask(id: string, label: string, prompt: string): SuggestionItem {
  return { id, label, action: { kind: "ask", prompt } };
}

function sub(id: string, label: string, phrase: string): SuggestionItem {
  return { id, label, action: { kind: "submit", phrase } };
}

// ─── Кампании ───────────────────────────────────────────────────────────────

const CAMPAIGN_FILTER_CHIPS: Record<CampaignStatus, SuggestionItem> = {
  active: {
    id: "sec-camp-active",
    label: "Активные кампании",
    action: {
      kind: "dispatch",
      action: { type: "campaigns_query_set", statuses: ["active"], sort: "default" },
    },
  },
  paused: {
    id: "sec-camp-paused",
    label: "На паузе",
    action: {
      kind: "dispatch",
      action: { type: "campaigns_query_set", statuses: ["paused"], sort: "default" },
    },
  },
  completed: {
    id: "sec-camp-completed",
    label: "Завершённые",
    action: {
      kind: "dispatch",
      action: { type: "campaigns_query_set", statuses: ["completed"], sort: "default" },
    },
  },
  draft: {
    id: "sec-camp-draft",
    label: "Черновики",
    action: {
      kind: "dispatch",
      action: { type: "campaigns_query_set", statuses: ["draft"], sort: "default" },
    },
  },
};

const CAMPAIGN_SORT_PROFIT: SuggestionItem = {
  id: "sec-camp-profit",
  label: "Самые прибыльные",
  action: {
    kind: "dispatch",
    action: { type: "campaigns_query_set", statuses: [], sort: "profit-desc" },
  },
};

const CAMPAIGN_SORT_CONVERSION: SuggestionItem = {
  id: "sec-camp-conversion",
  label: "По конверсии",
  action: {
    kind: "dispatch",
    action: { type: "campaigns_query_set", statuses: [], sort: "conversion-desc" },
  },
};

const CAMPAIGN_RESET_FILTERS: SuggestionItem = {
  id: "sec-camp-reset",
  label: "Сбросить фильтр",
  action: { kind: "dispatch", action: { type: "campaigns_filter_clear" } },
};

const CAMPAIGNS_EMPTY: SuggestionItem[] = [
  {
    id: "sec-camp-onboard-create",
    label: "Создать первую кампанию",
    action: { kind: "dispatch", action: { type: "start_signal_flow" } },
  },
  ask(
    "sec-camp-onboard-tour",
    "Как устроены кампании?",
    "расскажи, как устроены кампании в Афине"
  ),
];

function resolveCampaigns(s: CampaignsSub): SuggestionItem[] {
  if (!s.hasCampaigns) return CAMPAIGNS_EMPTY;

  const selected = new Set(s.activeFilter);
  const filterChips = (
    [
      "active",
      "paused",
      "completed",
      "draft",
    ] satisfies CampaignStatus[]
  )
    .filter((status) => !selected.has(status))
    .map((status) => CAMPAIGN_FILTER_CHIPS[status]);

  const sortChips: SuggestionItem[] = [];
  if (s.sort !== "profit-desc") sortChips.push(CAMPAIGN_SORT_PROFIT);
  if (s.sort !== "conversion-desc") sortChips.push(CAMPAIGN_SORT_CONVERSION);

  // Когда есть активный фильтр или сортировка — даём «Сбросить» первым.
  const reset =
    selected.size > 0 || s.sort !== "default" ? [CAMPAIGN_RESET_FILTERS] : [];

  return [...reset, ...sortChips.slice(0, 1), ...filterChips.slice(0, 3)];
}

// ─── Статистика ─────────────────────────────────────────────────────────────

// Ровно три рабочих запроса статистики (см. runStatsQuery в use-chat-submit):
// разрез по кампаниям, топ-10 кампаний по доходу, и «сложный» запрос про
// сравнение эффективности каналов. Выводим их как готовые подсказки.
function resolveStatistics(_s: StatisticsSub): SuggestionItem[] {
  return [
    sub("sec-stats-by-campaigns", "Разрез по кампаниям", "покажи по кампаниям"),
    sub("sec-stats-top-campaigns", "Топ-10 кампаний по доходу", "топ-10 кампаний по доходу за июнь"),
    sub("sec-stats-compare-channels", "Сравнить эффективность каналов", "сравни эффективность каналов"),
  ];
}

// ─── Сигналы ────────────────────────────────────────────────────────────────

const SIGNALS_EMPTY: SuggestionItem[] = [
  ask(
    "sec-sig-empty-what",
    "Что такое сигналы?",
    "Что такое сигналы и зачем они нужны?"
  ),
  {
    id: "sec-sig-empty-create",
    label: "Создать сигнал",
    action: { kind: "dispatch", action: { type: "start_signal_flow" } },
  },
];

/**
 * Чипы для непустого раздела: фильтры по статусу. Реестр приоритезирует те
 * статусы, по которым реально есть сигналы — пустые подсказки не показываем.
 */
const SIGNAL_FILTER_CHIPS: Array<{
  status: keyof SignalsSub["statusCounts"];
  chip: SuggestionItem;
}> = [
  {
    status: "ready",
    chip: ask("sec-sig-filter-ready", "Готовые", "Покажи готовые сигналы"),
  },
  {
    status: "processing",
    chip: ask("sec-sig-filter-processing", "В обработке", "Покажи сигналы в обработке"),
  },
  {
    status: "awaiting_payment",
    chip: ask(
      "sec-sig-filter-awaiting",
      "Ожидают оплаты",
      "Покажи сигналы, ожидающие оплаты"
    ),
  },
  {
    status: "draft",
    chip: ask("sec-sig-filter-draft", "Черновики", "Покажи сигналы-черновики"),
  },
  {
    status: "expired",
    chip: ask("sec-sig-filter-expired", "Устаревшие", "Покажи устаревшие сигналы"),
  },
  {
    status: "error",
    chip: ask("sec-sig-filter-error", "С ошибкой", "Покажи сигналы с ошибкой"),
  },
];

function resolveSignals(s: SignalsSub): SuggestionItem[] {
  const c = s.statusCounts;
  const total = c.draft + c.awaiting_payment + c.processing + c.ready + c.expired + c.error;
  if (total === 0) return SIGNALS_EMPTY;

  // Берём чипы только для статусов, в которых есть сигналы.
  return SIGNAL_FILTER_CHIPS.filter(({ status }) => c[status] > 0)
    .slice(0, 3)
    .map(({ chip }) => chip);
}

// ─── Настройки ──────────────────────────────────────────────────────────────

function resolveSettings(s: SettingsSub): SuggestionItem[] {
  const items: SuggestionItem[] = [];

  if (s.isBasicTariff) {
    items.push(ask("sec-set-tariff-up", "Расширить тариф", "хочу расширить тарифный план"));
  } else {
    items.push(ask("sec-set-tariff-info", "Текущий тариф", "покажи детали моего тарифа"));
  }

  if (!s.hasIntegrations) {
    items.push(
      ask("sec-set-integrations-add", "Подключить интеграции", "покажи доступные интеграции и помоги подключить")
    );
  } else {
    items.push(
      ask("sec-set-integrations-manage", "Управлять интеграциями", "покажи мои подключённые интеграции")
    );
  }

  items.push(ask("sec-set-notify", "Настроить уведомления", "настрой уведомления о новых сигналах и кампаниях"));

  return items;
}

// ─── Точка входа ────────────────────────────────────────────────────────────

export function resolveSection(s: SectionSub): SuggestionItem[] {
  switch (s.kind) {
    case "campaigns":
      return resolveCampaigns(s);
    case "statistics":
      return resolveStatistics(s);
    case "signals":
      return resolveSignals(s);
    case "settings":
      return resolveSettings(s);
  }
}
