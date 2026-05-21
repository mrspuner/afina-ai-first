/**
 * Pure math for the campaign payment screen.
 * Mocked numbers (COST_PER_TOUCH, recommendation band) — this is a prototype,
 * not a pricing engine; see spec §3.5 and §8.
 */

/** Mock price in roubles per one personalised touch. */
export const COST_PER_TOUCH = 5;

/**
 * How many touches the active budget buys, capped at audience size.
 * Negative or zero budget → 0; zero audience → 0.
 */
export function estimateTouches(budget: number, audienceSize: number): number {
  if (budget <= 0) return 0;
  if (audienceSize <= 0) return 0;
  return Math.min(audienceSize, Math.floor(budget / COST_PER_TOUCH));
}

/**
 * Recommended budget for a campaign of the given audience size.
 * Same convention as step-5-limit.tsx: random multiplier in [0.05, 0.45],
 * floor at 50 ₽. Each call is non-deterministic (callers cache via useMemo).
 */
export function recommendCampaignBudget(audienceSize: number): number {
  return Math.max(
    50,
    Math.round(audienceSize * (0.05 + Math.random() * 0.4))
  );
}
