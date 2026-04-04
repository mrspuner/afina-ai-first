"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StepContent } from "@/components/steps/step-content";
import { StepProps } from "@/types/campaign";

const SCENARIO_NAMES: Record<string, string> = {
  registration: "Регистрация",
  "first-deal": "Первая сделка",
  upsell: "Апсейл",
  retention: "Удержание",
  return: "Возврат",
  reactivation: "Реактивация",
};

const SEGMENT_NAMES: Record<string, string> = {
  max: "Максимальный (€ 0.45 / сигнал)",
  "very-high": "Очень высокий (€ 0.35 / сигнал)",
  high: "Высокий (€ 0.25 / сигнал)",
  medium: "Средний и ниже (€ 0.07 / сигнал)",
};

const SEGMENT_PRICES: Record<string, number> = {
  max: 0.45,
  "very-high": 0.35,
  high: 0.25,
  medium: 0.07,
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function Step6Summary({ data, onNext }: StepProps) {
  const limit = data.signalLimit ?? 0;
  const prices = data.segments.map((s) => SEGMENT_PRICES[s] ?? 0);
  const minCost = prices.length ? Math.min(...prices) * limit : 0;
  const maxCost = prices.length ? Math.max(...prices) * limit : 0;
  const costStr =
    minCost === maxCost
      ? `€ ${minCost.toFixed(2)}`
      : `€ ${minCost.toFixed(2)} – € ${maxCost.toFixed(2)}`;

  return (
    <StepContent
      title="Проверьте настройки кампании"
      subtitle="Если что-то нужно изменить — вернитесь к нужному шагу через навигацию"
    >
      <div className="rounded-lg border border-border bg-card">
        <div className="divide-y divide-border px-4">
          <SummaryRow
            label="Сценарий"
            value={SCENARIO_NAMES[data.scenario ?? ""] ?? "—"}
          />
          <SummaryRow
            label="Интересы"
            value={data.interests.length ? data.interests.join(", ") : "—"}
          />
          <SummaryRow
            label="Триггеры"
            value={data.triggers.length ? data.triggers.join(", ") : "—"}
          />
          <SummaryRow
            label="Сегменты"
            value={
              data.segments.length
                ? data.segments.map((s) => SEGMENT_NAMES[s]).join("; ")
                : "—"
            }
          />
          <SummaryRow
            label="Лимит сигналов"
            value={limit ? `${limit.toLocaleString("ru")} сигналов` : "—"}
          />
          <SummaryRow label="Ориентировочная стоимость" value={costStr} />
          <SummaryRow
            label="Файл с базой"
            value={data.file ? data.file.name : "—"}
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
