import type { Signal } from "./app-state";

/**
 * Ветки разделения «по сегменту» (спека A6).
 *
 * Источник — категории, выбранные в сигнале на шаге 3 визарда
 * (`signal.wizardData?.segments` — массив id: max / very-high / high / medium).
 * Если снимка визарда нет (пресеты / загруженная база) — фолбэк на
 * материализованные тиры сигнала (`segments: {max, high, mid, low}` с ненулевым
 * объёмом), иначе на четыре дефолтные категории. Так число и подписи веток
 * сплита всегда совпадают с тем, что реально выбрано в сигнале.
 */

export interface SegmentBranch {
  key: string;
  label: string;
}

/** Подписи категорий — синхронны со SEGMENTS из step-3-segments.tsx. */
export const SEGMENT_LABELS: Record<string, string> = {
  max: "Максимальный",
  "very-high": "Очень высокий",
  high: "Высокий",
  medium: "Средний и ниже",
};

const SEGMENT_ORDER = ["max", "very-high", "high", "medium"];

const DEFAULT_BRANCHES: SegmentBranch[] = SEGMENT_ORDER.map((key) => ({
  key,
  label: SEGMENT_LABELS[key],
}));

// Соответствие материализованных тиров (Signal.segments) категориям визарда.
const TIER_TO_SEGMENT: Array<{ tier: keyof Signal["segments"]; key: string }> = [
  { tier: "max", key: "max" },
  { tier: "high", key: "very-high" },
  { tier: "mid", key: "high" },
  { tier: "low", key: "medium" },
];

export function splitSegmentBranches(signal?: Signal | null): SegmentBranch[] {
  if (!signal) return DEFAULT_BRANCHES;

  // 1) Снимок визарда — самый точный источник выбранных категорий.
  const selected = signal.wizardData?.segments;
  if (selected && selected.length > 0) {
    const ordered = SEGMENT_ORDER.filter((k) => selected.includes(k));
    const known = ordered.length > 0 ? ordered : selected;
    return known.map((key) => ({
      key,
      label: SEGMENT_LABELS[key] ?? key,
    }));
  }

  // 2) Фолбэк — материализованные тиры с ненулевым объёмом.
  const tiers = TIER_TO_SEGMENT.filter(({ tier }) => signal.segments?.[tier] > 0);
  if (tiers.length > 0) {
    return tiers.map(({ key }) => ({ key, label: SEGMENT_LABELS[key] }));
  }

  // 3) Последний фолбэк — четыре дефолтные категории.
  return DEFAULT_BRANCHES;
}
