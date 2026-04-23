"use client";

import { useAppDispatch, useAppState } from "@/state/app-state-context";
import {
  isStep1Active,
  isStep2Active,
  isStep3Active,
} from "@/state/app-state";
import { cn } from "@/lib/utils";

type Step = {
  n: 1 | 2 | 3;
  heading: string;
  description: string;
};

const STEPS: readonly Step[] = [
  {
    n: 1,
    heading: "Получение сигнала",
    description:
      "Загрузите базу клиентов, чтобы платформа начала фиксировать моменты их активности.",
  },
  {
    n: 2,
    heading: "Запуск кампании",
    description:
      "Настройте автоматическое действие в ответ на сигнал: SMS, push или передачу в CRM.",
  },
  {
    n: 3,
    heading: "Получение статистики",
    description:
      "Отслеживайте конверсию и эффективность каждой кампании.",
  },
] as const;

export function OnboardingStepCards() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const stepState = {
    1: {
      active: isStep1Active(state),
      onClick: isStep1Active(state)
        ? () => dispatch({ type: "start_signal_flow" })
        : undefined,
    },
    2: {
      active: isStep2Active(state),
      onClick: isStep2Active(state)
        ? () => dispatch({ type: "step2_clicked" })
        : undefined,
    },
    3: {
      active: isStep3Active(state),
      onClick: undefined as (() => void) | undefined,
    },
  } as const;

  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {STEPS.map((step) => {
        const { active, onClick } = stepState[step.n];
        return (
          <button
            key={step.n}
            type="button"
            disabled={!active}
            onClick={onClick}
            className={cn(
              "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
              active
                ? onClick
                  ? "cursor-pointer border-border bg-card hover:border-border hover:bg-accent"
                  : "cursor-default border-border bg-card"
                : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Шаг {step.n}
            </span>
            <span className="mt-1.5 text-sm font-medium text-foreground">
              {step.heading}
            </span>
            <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {step.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
