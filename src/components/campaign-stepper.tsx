"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPPER_ITEMS = [
  { label: "Интересы", step: 2 },
  { label: "Сегменты", step: 3 },
  { label: "Лимиты", step: 4 },
  { label: "База", step: 5 },
  { label: "Сводка", step: 6 },
  { label: "Обработка", step: 7 },
  { label: "Результат", step: 8 },
];

interface CampaignStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  disabled?: boolean;
}

export function CampaignStepper({
  currentStep,
  onStepClick,
  disabled = false,
}: CampaignStepperProps) {
  return (
    <div className="flex flex-col gap-1">
      {STEPPER_ITEMS.map(({ label, step }, idx) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const isPending = step > currentStep;
        const isClickable = isCompleted && !disabled;

        return (
          <div key={step} className="flex items-center gap-2.5">
            {/* Connector line above (except first item) */}
            <div className="flex flex-col items-center self-stretch">
              <div
                className={cn(
                  "w-px flex-1",
                  idx === 0 ? "invisible" : isCompleted || isActive ? "bg-primary" : "bg-border"
                )}
              />
              {/* Circle */}
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-colors",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isActive &&
                    "border-primary bg-background text-primary ring-2 ring-primary/20",
                  isPending && "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div
                className={cn(
                  "w-px flex-1",
                  idx === STEPPER_ITEMS.length - 1
                    ? "invisible"
                    : isCompleted
                    ? "bg-primary"
                    : "bg-border"
                )}
              />
            </div>

            {/* Label */}
            <button
              onClick={() => isClickable && onStepClick(step)}
              disabled={!isClickable}
              className={cn(
                "py-1 text-xs transition-colors",
                isActive && "font-medium text-foreground",
                isCompleted && !disabled
                  ? "cursor-pointer text-foreground hover:text-primary"
                  : "cursor-default",
                isPending && "text-muted-foreground"
              )}
            >
              {label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
