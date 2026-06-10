"use client";

import { selectedSegmentsInOrder } from "@/sections/signals/segments-catalog";
import { estimateSignalCount } from "@/state/metrics";

interface SegmentPriorityBreakdownProps {
  /** Selected segment ids (any order). */
  segments: string[];
  /** Active budget in roubles. */
  budget: number;
  className?: string;
}

/**
 * «Как подбираются сигналы» — объясняет порядок подбора: бюджет идёт сверху
 * вниз по качеству. Показывает выбранные сегменты в порядке убывания качества
 * (очередь подбора), приблизительный общий потолок «до N сигналов» и сноску.
 * Точные количества по сегментам сознательно не показываем — они зависят от
 * базы и известны только после подбора.
 */
export function SegmentPriorityBreakdown({
  segments,
  budget,
  className,
}: SegmentPriorityBreakdownProps) {
  const ordered = selectedSegmentsInOrder(segments);
  if (ordered.length === 0) return null;

  const cap = estimateSignalCount(segments, budget);

  return (
    <div
      className={
        "rounded-lg border border-border bg-card px-4 py-3.5" +
        (className ? ` ${className}` : "")
      }
    >
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Как подбираются сигналы
      </h3>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Бюджет идёт сверху вниз: сначала находим самых точных пользователей,
        затем менее точных — пока не закончится сумма.
      </p>

      <ol className="mt-3 flex flex-col gap-1.5">
        {ordered.map((seg, i) => (
          <li
            key={seg.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate text-foreground">
              <span className="tabular-nums text-muted-foreground">{i + 1}.</span>{" "}
              {seg.name}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              ₽ {seg.price.toFixed(2)} / сигнал
            </span>
          </li>
        ))}
      </ol>

      {cap > 0 && (
        <p className="mt-3 border-t border-border pt-2.5 text-sm font-medium text-foreground">
          Всего до {cap.toLocaleString("ru")} сигналов в рамках бюджета
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Точное распределение по сегментам станет известно после подбора — оно
        зависит от вашей базы.
      </p>
    </div>
  );
}
