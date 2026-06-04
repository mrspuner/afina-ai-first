export { SCENARIO_NAMES } from "@/data/scenarios";
// Цены сегментов — единый источник в движке чисел (src/state/metrics.ts).
export { SEGMENT_PRICES } from "@/state/metrics";

/** Segment key → labelled price line (prototype pricing). */
export const SEGMENT_NAMES: Record<string, string> = {
  max: "Максимальный (₽ 0.45 / сигнал)",
  "very-high": "Очень высокий (₽ 0.35 / сигнал)",
  high: "Высокий (₽ 0.25 / сигнал)",
  medium: "Средний и ниже (₽ 0.07 / сигнал)",
};
