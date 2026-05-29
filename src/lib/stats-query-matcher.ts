/**
 * Hard-coded matcher for the three Statistics-section PromptBar queries.
 * No LLM — three known intents, looser-than-exact matching via required
 * substring groups: each group must have at least one alternative present
 * in the normalized text for the query to match.
 *
 * Order of QUERIES matters: composite Q2 must be checked before generic Q1
 * to avoid stealing matches.
 */

export const STATS_DEMO_YEAR = 2026;

export type StatsQueryId =
  | "group-by-campaigns"
  | "top-campaigns-income-june"
  | "top-campaigns-income"
  | "best-day-income"
  | "compare-channels"
  | "compare-prev-period"
  | "breakdown-by-channels"
  | "breakdown-by-creatives"
  | "trend-by-period"
  | "top-by-conversion";

export interface StatsQueryMatch {
  id: StatsQueryId;
}

interface StatsQueryDef {
  id: StatsQueryId;
  groups: string[][];
}

const QUERIES: StatsQueryDef[] = [
  // Most specific first — composite queries before their generic prefixes.
  {
    id: "top-campaigns-income-june",
    groups: [
      ["топ", "top"],
      ["кампани", "campaign"],
      ["доход", "income", "выручк"],
      ["июн", "june"],
    ],
  },
  {
    id: "top-campaigns-income",
    groups: [
      ["топ", "top"],
      ["кампани", "campaign"],
      ["доход", "income", "выручк"],
    ],
  },
  {
    id: "top-by-conversion",
    groups: [
      ["топ", "top"],
      ["конверси", "конверсия", "ar", "аппрув"],
    ],
  },
  {
    id: "best-day-income",
    groups: [
      ["лучш", "найди лучш"],
      ["день", "дням", "дню", "дней", "дня"],
      ["доход", "income", "выручк"],
    ],
  },
  {
    id: "compare-channels",
    groups: [
      ["сравни", "сравнить", "сравнение"],
      ["эффективност"],
      ["канал"],
    ],
  },
  {
    id: "compare-prev-period",
    groups: [
      ["сравни", "сравнить", "сравнение"],
      ["вчера", "прошл", "предыдущ", "месяц", "квартал", "год", "период"],
    ],
  },
  {
    id: "breakdown-by-channels",
    groups: [
      ["разбей", "разбить", "разбивк", "по каналам"],
      ["канал"],
    ],
  },
  {
    id: "breakdown-by-creatives",
    groups: [
      ["разбей", "разбить", "разбивк", "по креатив"],
      ["креатив"],
    ],
  },
  {
    id: "trend-by-period",
    groups: [["тренд", "динамик"]],
  },
  {
    id: "group-by-campaigns",
    groups: [
      ["покажи", "показать", "сгруппируй", "группируй", "разбей", "разбить", "разбивк", "по разрезу"],
      ["кампани"],
    ],
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,!?…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchStatsQuery(rawText: string): StatsQueryMatch | null {
  const text = normalize(rawText);
  if (!text) return null;

  for (const def of QUERIES) {
    const allGroupsMatch = def.groups.every((alternatives) =>
      alternatives.some((alt) => text.includes(alt))
    );
    if (allGroupsMatch) return { id: def.id };
  }
  return null;
}
