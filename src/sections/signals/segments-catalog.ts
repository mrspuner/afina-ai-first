// Canonical catalog of signal-quality segments, ordered by descending quality
// (and price). Single source for segment ids, labels, prices and descriptions —
// shared by the segment picker (step 3) and the «порядок подбора» breakdown.
// Prices mirror SEGMENT_PRICES in the number engine (asserted in tests).

export interface SegmentMeta {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const SEGMENTS: SegmentMeta[] = [
  {
    id: "max",
    name: "Максимальный",
    price: 0.45,
    description: "Высочайшая вероятность отклика",
  },
  {
    id: "very-high",
    name: "Очень высокий",
    price: 0.35,
    description: "Сильный интерес, высокая готовность",
  },
  {
    id: "high",
    name: "Высокий",
    price: 0.25,
    description: "Выраженный интерес к категории",
  },
  {
    id: "medium",
    name: "Средний и ниже",
    price: 0.07,
    description: "Общий интерес без явных триггеров",
  },
];

/**
 * The selected segments in catalog order (descending quality) — the order in
 * which budget is spent: the top selected segment is filled first, then the
 * next, and so on. Unknown ids are dropped.
 */
export function selectedSegmentsInOrder(selected: readonly string[]): SegmentMeta[] {
  return SEGMENTS.filter((seg) => selected.includes(seg.id));
}
