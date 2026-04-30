"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";

const SEGMENT_PRICES: Record<string, number> = {
  max: 0.45,
  "very-high": 0.35,
  high: 0.25,
  medium: 0.07,
};

function calcSignals(segments: string[], budget: number): string {
  if (segments.length === 0) return "—";
  const prices = segments.map((s) => SEGMENT_PRICES[s] ?? 0).filter(Boolean);
  if (prices.length === 0) return "—";
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const maxSignals = Math.floor(budget / minPrice);
  const minSignals = Math.floor(budget / maxPrice);
  if (minSignals === maxSignals) return `${maxSignals.toLocaleString("ru")} сигналов`;
  return `${minSignals.toLocaleString("ru")} – ${maxSignals.toLocaleString("ru")} сигналов`;
}

/** Derive a recommended budget from the imported base size. The constants
 *  here are eyeball-picked: 5%–45% of the row count yields a number that
 *  fits the existing 0.07–0.45 ₽/signal price range without leaving the
 *  user with a degenerate estimate. We use Math.random for this prototype
 *  — stability across the same step revisit comes from caching the value
 *  in the wizard's stepData on first compute, not the rng. */
function recommendBudget(rowCount: number): number {
  return Math.max(50, Math.round(rowCount * (0.05 + Math.random() * 0.4)));
}

export function Step5Limit({ data, onNext }: StepProps) {
  // Initial budget priority:
  //  1. user-entered value carried over from a prior visit
  //  2. recommendation derived from the uploaded base size
  //  3. blank input (legacy behaviour when wizard is launched without база)
  const [value, setValue] = useState<string>(() => {
    if (data.budget) return String(data.budget);
    if (typeof data.fileRowCount === "number") {
      return String(recommendBudget(data.fileRowCount));
    }
    return "";
  });

  const parsed = parseFloat(value);
  const isValid = !isNaN(parsed) && parsed > 0;
  const estimatedSignals = calcSignals(data.segments, isValid ? parsed : 0);

  const baseSizeLabel =
    typeof data.fileRowCount === "number"
      ? `${(data.fileRowCount / 1000).toFixed(1)} тыс. контактов`
      : null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setValue(raw);
  }

  return (
    <StepContent
      title="Укажите максимальный бюджет"
      subtitle="Мы найдём максимальное количество сигналов в рамках этой суммы"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Например, 500"
              value={value}
              onChange={handleChange}
              className="pr-9 text-lg"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              ₽
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Приблизительное количество сигналов:{" "}
            <span className="font-medium text-foreground">
              {isValid ? estimatedSignals : "—"}
            </span>
          </p>
          {baseSizeLabel && (
            <p className="text-xs text-muted-foreground">
              Рекомендуемая сумма для базы {baseSizeLabel}
            </p>
          )}
        </div>

        <div className="flex justify-start">
          <Button
            disabled={!isValid}
            onClick={() => onNext({ budget: parsed })}
          >
            Далее
          </Button>
        </div>
      </div>
    </StepContent>
  );
}
