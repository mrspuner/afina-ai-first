export { SCENARIO_NAMES } from "@/data/scenarios";

/** Segment key → labelled price line (prototype pricing). */
export const SEGMENT_NAMES: Record<string, string> = {
  max: "Максимальный (₽ 0.45 / сигнал)",
  "very-high": "Очень высокий (₽ 0.35 / сигнал)",
  high: "Высокий (₽ 0.25 / сигнал)",
  medium: "Средний и ниже (₽ 0.07 / сигнал)",
};

export const SEGMENT_PRICES: Record<string, number> = {
  max: 0.45,
  "very-high": 0.35,
  high: 0.25,
  medium: 0.07,
};
