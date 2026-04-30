"use client";

import type { ReactNode } from "react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import {
  isStep1Active,
  isStep2Active,
  isStep3Active,
} from "@/state/app-state";
import { Button } from "@/components/ui/button";
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

function StepBody({
  step,
  cta,
}: {
  step: Step;
  cta?: ReactNode;
}) {
  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Шаг {step.n}
      </span>
      <span className="mt-1.5 text-sm font-medium text-foreground">
        {step.heading}
      </span>
      <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {step.description}
      </span>
      {cta}
    </>
  );
}

function cardClass(active: boolean, interactive: boolean) {
  return cn(
    "flex flex-col items-start rounded-lg border p-4 text-left",
    "transition-[opacity,border-color,background-color,transform] duration-200 ease-out",
    active
      ? interactive
        ? "cursor-pointer border-border bg-card hover:border-border hover:bg-accent active:scale-[0.98]"
        : "cursor-default border-border bg-card"
      : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
  );
}

export function OnboardingStepCards() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const [step1, step2, step3] = STEPS;
  const step1Active = isStep1Active(state);
  const step2Active = isStep2Active(state);
  const step3Active = isStep3Active(state);

  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {/* Step 1 — explicit CTA inside the card. The card itself is no longer
          a button: the CTA is the single primary entry point on the start
          screen, removing the implicit equivalence with the chat and the
          prompt-bar (per docs/start-screen-konfiguratsiya.md). The wizard
          gates on surveyStatus (Worktree B), so pressing the CTA routes a
          first-time user through the anketa before the wizard. */}
      <div className={cardClass(step1Active, false)}>
        <StepBody
          step={step1}
          cta={
            step1Active ? (
              <Button
                size="default"
                className="mt-4 w-full"
                onClick={() => dispatch({ type: "start_signal_flow" })}
              >
                Создать сигнал
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Steps 2 and 3 keep the card-as-button affordance — only step 1
          gets the explicit CTA per spec. */}
      <button
        type="button"
        disabled={!step2Active}
        onClick={
          step2Active ? () => dispatch({ type: "step2_clicked" }) : undefined
        }
        className={cardClass(step2Active, step2Active)}
      >
        <StepBody step={step2} />
      </button>

      <button type="button" disabled className={cardClass(step3Active, false)}>
        <StepBody step={step3} />
      </button>
    </div>
  );
}
