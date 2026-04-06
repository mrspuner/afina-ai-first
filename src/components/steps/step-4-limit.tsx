"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepContent } from "@/components/steps/step-content";
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

export function Step4Limit({ data, onNext }: StepProps) {
  const [value, setValue] = useState<string>(
    data.budget ? String(data.budget) : ""
  );

  const parsed = parseFloat(value);
  const isValid = !isNaN(parsed) && parsed > 0;
  const estimatedSignals = calcSignals(data.segments, isValid ? parsed : 0);

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
              $
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Приблизительное количество сигналов:{" "}
            <span className="font-medium text-foreground">
              {isValid ? estimatedSignals : "—"}
            </span>
          </p>
        </div>

        <div className="flex justify-end">
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
