"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { cn } from "@/lib/utils";

const SCENARIO_NAMES: Record<string, string> = {
  registration: "Регистрация",
  "first-deal": "Первая сделка",
  upsell: "Апсейл",
  retention: "Удержание",
  return: "Возврат",
  reactivation: "Реактивация",
};

const SEGMENT_NAMES: Record<string, string> = {
  max: "Максимальный (₽ 0.45 / сигнал)",
  "very-high": "Очень высокий (₽ 0.35 / сигнал)",
  high: "Высокий (₽ 0.25 / сигнал)",
  medium: "Средний и ниже (₽ 0.07 / сигнал)",
};

const SEGMENT_PRICES: Record<string, number> = {
  max: 0.45,
  "very-high": 0.35,
  high: 0.25,
  medium: 0.07,
};

function SummaryRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start justify-between gap-4 py-3 transition-colors",
        onClick && "cursor-pointer rounded px-2 -mx-2 hover:bg-accent"
      )}
    >
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function Step6Summary({ data, onNext, onGoToStep }: StepProps) {
  const budget = data.budget ?? 0;
  const prices = data.segments.map((s) => SEGMENT_PRICES[s] ?? 0).filter(Boolean);
  const minSignals = prices.length ? Math.floor(budget / Math.max(...prices)) : 0;
  const maxSignals = prices.length ? Math.floor(budget / Math.min(...prices)) : 0;
  const signalsStr =
    minSignals === maxSignals
      ? `${maxSignals.toLocaleString("ru")} сигналов`
      : `${minSignals.toLocaleString("ru")} – ${maxSignals.toLocaleString("ru")} сигналов`;

  const goto = onGoToStep;

  return (
    <StepContent
      title="Проверьте настройки кампании"
      subtitle="Нажмите на строку, чтобы вернуться к шагу для редактирования"
    >
      <div className="rounded-lg border border-border bg-card">
        <div className="divide-y divide-border px-4">
          <SummaryRow
            label="Сценарий"
            value={SCENARIO_NAMES[data.scenario ?? ""] ?? "—"}
            onClick={goto ? () => goto(1) : undefined}
          />
          <SummaryRow
            label="Интересы"
            value={data.interests.length ? data.interests.join(", ") : "—"}
            onClick={goto ? () => goto(2) : undefined}
          />
          <SummaryRow
            label="Триггеры"
            value={data.triggers.length ? data.triggers.join(", ") : "—"}
            onClick={goto ? () => goto(2) : undefined}
          />
          <SummaryRow
            label="Сегменты"
            value={
              data.segments.length
                ? data.segments.map((s) => SEGMENT_NAMES[s]).join("; ")
                : "—"
            }
            onClick={goto ? () => goto(3) : undefined}
          />
          <SummaryRow
            label="Максимальный бюджет"
            value={budget ? `₽ ${budget.toFixed(2)}` : "—"}
            onClick={goto ? () => goto(4) : undefined}
          />
          <SummaryRow
            label="Максимум сигналов"
            value={budget && prices.length ? signalsStr : "—"}
          />
          <SummaryRow
            label="Файл с базой"
            value={data.file ? data.file.name : "—"}
            onClick={goto ? () => goto(5) : undefined}
          />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-end">
        <Button onClick={() => onNext({})}>Подтвердить и запустить</Button>
      </div>
    </StepContent>
  );
}
