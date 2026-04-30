"use client";

import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  {
    id: "registration",
    name: "Регистрация",
    description: "Возврат пользователей после незавершённой регистрации или брошенной корзины",
  },
  {
    id: "first-deal",
    name: "Первая сделка",
    description: "Обогащение данных о клиенте, оценка потенциала и рисков",
  },
  {
    id: "upsell",
    name: "Апсейл",
    description: "Мониторинг интереса к конкурентам, предотвращение оттока",
  },
  {
    id: "retention",
    name: "Удержание",
    description: "Мониторинг интереса к конкурентам и предотвращение оттока",
  },
  {
    id: "return",
    name: "Возврат",
    description: "Определение оптимального момента для повторного контакта",
  },
  {
    id: "reactivation",
    name: "Реактивация",
    description: "Определение оптимального момента для повторного контакта",
  },
];

export function Step1Scenario({ data, onNext }: StepProps) {
  // Safety net: a sidebar-driven entry to the wizard must NOT visually
  // pre-select a scenario — `data.scenario` is `null` for that path. If a
  // future regression sets `data.scenario` to a non-empty string here without
  // user interaction, this guard keeps step-1 visually pristine until the
  // user picks one themselves.
  const visualScenario =
    typeof data.scenario === "string" && data.scenario.length > 0
      ? data.scenario
      : null;

  function handleSelect(id: string) {
    onNext({ scenario: id });
  }

  return (
    <StepContent
      title="Выберите тип сигнала"
      subtitle="Выберите сценарий, мы зададим нужные вопросы"
    >
      <div className="grid grid-cols-3 gap-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelect(s.id)}
            className={cn(
              "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
              visualScenario === s.id
                ? "border-primary bg-accent ring-1 ring-primary"
                : "border-border bg-card hover:bg-accent hover:border-border"
            )}
          >
            <span className="text-sm font-medium text-foreground">{s.name}</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {s.description}
            </span>
          </button>
        ))}
      </div>
    </StepContent>
  );
}
