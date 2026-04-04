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

function calcCost(segments: string[], limit: number | null): string {
  if (!limit || segments.length === 0) return "—";
  const prices = segments.map((s) => SEGMENT_PRICES[s] ?? 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `€ ${(max * limit).toFixed(2)}`;
  return `€ ${(min * limit).toFixed(2)} – € ${(max * limit).toFixed(2)}`;
}

export function Step4Limit({ data, onNext }: StepProps) {
  const [value, setValue] = useState<string>(
    data.signalLimit ? String(data.signalLimit) : ""
  );

  const parsed = parseInt(value, 10);
  const isValid = !isNaN(parsed) && parsed > 0;
  const estimatedCost = calcCost(data.segments, isValid ? parsed : null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setValue(raw);
  }

  return (
    <StepContent
      title="Укажите лимит сигналов"
      subtitle="Мы остановимся, как только наберём нужное количество"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Например, 1000"
            value={value}
            onChange={handleChange}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">
            Ориентировочная стоимость:{" "}
            <span className="font-medium text-foreground">{estimatedCost}</span>
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!isValid}
            onClick={() => onNext({ signalLimit: parsed })}
          >
            Далее
          </Button>
        </div>
      </div>
    </StepContent>
  );
}
