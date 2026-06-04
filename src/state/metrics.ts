// Single deterministic source of truth for every "magic" number in the
// prototype. Signal counts, segment splits, budget estimates and the
// statistics funnel are all derived here from stable inputs (entity ids,
// labels, budgets). The same input always yields the same number, and numbers
// that describe the same thing — a signal's count, its segment breakdown, the
// statistics of a campaign built on that signal — stay consistent on every
// screen. No `Math.random`, no per-module PRNGs: one engine, used everywhere.

import type { Currency } from "@/sections/statistics/statistics-state";

// ---------------------------------------------------------------------------
// Core primitives
// ---------------------------------------------------------------------------

/** FNV-1a hash → 32-bit unsigned seed. Stable across runs for equal inputs. */
export function hashSeed(...parts: Array<string | number>): number {
  let h = 2166136261;
  const s = parts.join("");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — the one PRNG used across the app. Deterministic per seed. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a deterministic RNG seeded by arbitrary stable parts. */
export function rngFor(...parts: Array<string | number>): () => number {
  return makeRng(hashSeed(...parts));
}

export function seededInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Signal segments
// ---------------------------------------------------------------------------

export type Segments = { max: number; high: number; mid: number; low: number };

/**
 * Splits a total into the four signal-quality buckets. The low bucket absorbs
 * the rounding remainder so the four parts always sum to EXACTLY `count` — the
 * invariant that keeps "сигналов найдено" (sum of segments) equal to the
 * signal's `count` shown on its card.
 */
export function splitSegments(count: number, rng: () => number): Segments {
  const weights = [rng(), rng(), rng(), rng()];
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const max = Math.floor((count * weights[0]) / total);
  const high = Math.floor((count * weights[1]) / total);
  const mid = Math.floor((count * weights[2]) / total);
  const low = count - max - high - mid;
  return { max, high, mid, low };
}

/**
 * Stable segment breakdown for a signal, keyed by its id so it never drifts
 * between renders and always sums to `count`. Use this anywhere a signal's
 * segments are materialised (wizard launch, file upload, presets).
 */
export function segmentsForSignal(signalId: string, count: number): Segments {
  return splitSegments(count, rngFor("segments", signalId));
}

// ---------------------------------------------------------------------------
// Budget → reachable signal count (single canonical formula)
// ---------------------------------------------------------------------------

/** Segment key → per-signal price (prototype pricing). The one true table. */
export const SEGMENT_PRICES: Record<string, number> = {
  max: 0.45,
  "very-high": 0.35,
  high: 0.25,
  medium: 0.07,
};

function selectedPrices(segments: readonly string[]): number[] {
  return segments.map((s) => SEGMENT_PRICES[s] ?? 0).filter(Boolean);
}

/**
 * The maximum number of signals a budget can reach — budget divided by the
 * cheapest selected segment. This is the figure a launched signal carries as
 * its `count`, so the wizard's upper estimate and the resulting card always
 * agree.
 */
export function estimateSignalCount(
  segments: readonly string[],
  budget: number,
): number {
  const prices = selectedPrices(segments);
  if (!prices.length || budget <= 0) return 0;
  return Math.floor(budget / Math.min(...prices));
}

/**
 * Inclusive [min, max] band of reachable signals for the budget. The upper
 * bound equals {@link estimateSignalCount}, so the range the user sees on
 * step-5/step-6 always contains the count the signal ends up with.
 */
export function signalCountRange(
  segments: readonly string[],
  budget: number,
): { min: number; max: number } {
  const prices = selectedPrices(segments);
  if (!prices.length || budget <= 0) return { min: 0, max: 0 };
  return {
    min: Math.floor(budget / Math.max(...prices)),
    max: Math.floor(budget / Math.min(...prices)),
  };
}

/** Deterministic budget recommendation from a parsed base size. */
export function recommendBudget(rowCount: number): number {
  if (rowCount <= 0) return 0;
  const rng = rngFor("budget", rowCount);
  return Math.max(50, Math.round(rowCount * (0.05 + rng() * 0.4)));
}

// ---------------------------------------------------------------------------
// Statistics funnel
// ---------------------------------------------------------------------------

export type Funnel = {
  expenses: string;
  income: string;
  sends: number;
  actions: number;
  holds: number;
  approves: number;
  ar: string;
  rejects: number;
  rr: string;
  clicks: number;
};

const CURRENCY_SYMBOL: Record<Currency, string> = {
  usd: "$",
  eur: "€",
  rub: "₽",
};

const CURRENCY_RATE: Record<Currency, number> = {
  usd: 1,
  eur: 0.92,
  rub: 93,
};

function formatMoney(value: number, currency: Currency): string {
  const fmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${fmt} ${CURRENCY_SYMBOL[currency]}`;
}

/**
 * Derives a full marketing funnel from a seeded RNG. When `baseSends` is given
 * (an entity-derived audience size, e.g. a campaign's reachable contacts) the
 * funnel scales off it; otherwise a plausible send volume is drawn from the
 * stream. Downstream ratios (clicks/actions/holds/…) are identical in both
 * paths, so a campaign's stats and an abstract row read the same way.
 */
export function deriveFunnel(
  rng: () => number,
  currency: Currency,
  baseSends?: number,
): Funnel {
  const sends = baseSends ?? 2500 + Math.floor(rng() * 35000);
  const clicks = Math.floor(sends * (0.35 + rng() * 0.35));
  const actions = Math.floor(sends * (0.04 + rng() * 0.08));
  const holds = Math.floor(actions * (0.2 + rng() * 0.25));
  const approves = Math.floor(actions * (0.45 + rng() * 0.25));
  const rejects = Math.max(0, actions - holds - approves);
  const expensesUsd = 300 + rng() * 5000;
  const incomeUsd = expensesUsd * (4 + rng() * 18);
  const rate = CURRENCY_RATE[currency];
  const ar = (approves / Math.max(sends, 1)) * 100;
  const rr = (rejects / Math.max(sends, 1)) * 100;
  return {
    expenses: formatMoney(expensesUsd * rate, currency),
    income: formatMoney(incomeUsd * rate, currency),
    sends,
    clicks,
    actions,
    holds,
    approves,
    rejects,
    ar: `${ar.toFixed(2)}%`,
    rr: `${rr.toFixed(2)}%`,
  };
}

/** Funnel for a stable string key (abstract statistics rows: days, channels…). */
export function funnelForKey(
  currency: Currency,
  ...parts: Array<string | number>
): Funnel {
  return deriveFunnel(rngFor(...parts), currency);
}

/**
 * Funnel for a real campaign, anchored to the audience of its source signal.
 * `sends` can never exceed the signal's `count` (you can't message more people
 * than the signal found), so a campaign's statistics are a faithful downstream
 * of the very number shown on the signal card. Deterministic per campaign id.
 */
export function deriveCampaignFunnel(
  campaignId: string,
  signalCount: number | undefined,
  currency: Currency,
): Funnel {
  const rng = rngFor("campaign-stats", campaignId);
  const reach = signalCount ?? 0;
  const sends =
    reach > 0
      ? Math.max(1, Math.floor(reach * (0.4 + rng() * 0.5)))
      : undefined;
  return deriveFunnel(rng, currency, sends);
}
