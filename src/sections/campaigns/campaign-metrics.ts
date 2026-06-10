import type { Campaign, Signal } from "@/state/app-state";
import { aggregate, buildFacts } from "@/sections/statistics/fact-cube";
import { recommendBudget } from "@/state/metrics";
import { COST_PER_TOUCH } from "./campaign-payment-math";

/**
 * Метрики карточки кампании, посчитанные из того же куба статистики
 * (`fact-cube`), что и раздел «Статистика» — поэтому «Отправки» и CR на
 * карточке совпадают с разрезом по кампаниям в отчёте. Отдельного `mock-stats`
 * больше нет: единый движок чисел, один источник правды.
 */
export interface CampaignCardMetrics {
  /** Запущена ли кампания (active/paused/completed) — у draft метрик факта нет. */
  launched: boolean;
  /** Отправки за всё время жизни кампании (из куба). */
  sends: number;
  /** CR = approves ÷ sends, в процентах (как AR в статистике). */
  crPct: number;
  /** Расчётный (плановый) бюджет, ₽. */
  plannedBudget: number;
  /** Фактические расходы, ₽ — по реально отправленным касаниям из куба. */
  actualSpend: number;
}

function isLaunched(status: Campaign["status"]): boolean {
  return status === "active" || status === "paused" || status === "completed";
}

export function getCampaignCardMetrics(
  campaign: Campaign,
  signal: Signal | undefined,
): CampaignCardMetrics {
  const launched = isLaunched(campaign.status);

  // Расчётный бюджет: то, что пользователь заложил при запуске; для черновика —
  // детерминированная рекомендация от размера аудитории сигнала.
  const plannedBudget =
    campaign.budget ?? (signal ? recommendBudget(signal.count) : 0);

  if (!launched) {
    return { launched, sends: 0, crPct: 0, plannedBudget, actualSpend: 0 };
  }

  // Считаем факты только для этой кампании за всё её время жизни (широкий
  // период — границы куб всё равно обрежет по реальному окну кампании).
  const now = new Date();
  const period = { from: new Date(2000, 0, 1), to: now };
  const facts = buildFacts(
    {
      campaigns: [campaign],
      signals: signal ? [{ id: signal.id, count: signal.count }] : [],
    },
    period,
    { now },
  );
  const agg = aggregate(facts);
  const crPct = agg.sends > 0 ? (agg.approves / agg.sends) * 100 : 0;
  // Фактические расходы выводим из реально отправленных касаний по той же цене
  // за касание, что и плановый бюджет, — расчётный и факт сопоставимы, но
  // отличаются (доставленный объём ≠ плановый).
  const actualSpend = agg.sends * COST_PER_TOUCH;

  return { launched, sends: agg.sends, crPct, plannedBudget, actualSpend };
}
