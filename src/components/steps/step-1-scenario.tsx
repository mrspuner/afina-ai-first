"use client";

import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import { StepContent } from "@/components/steps/step-content";
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
  const { textInput } = usePromptInputController();

  function handleSelect(id: string, name: string) {
    textInput.setInput(`Сценарий: ${name}. `);
    onNext({ scenario: id });
  }

  return (
    <StepContent
      title="Создайте новую кампанию"
      subtitle="Выберите сценарий — мы зададим нужные вопросы"
    >
      <div className="grid grid-cols-3 gap-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id, s.name)}
            className={cn(
              "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
              data.scenario === s.id
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
