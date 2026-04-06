"use client";

import { StepContent } from "@/components/steps/step-content";
import { cn } from "@/lib/utils";

const CAMPAIGNS = [
  {
    id: "abandoned",
    name: "Возврат брошенных действий",
    description: "Возвращаем пользователей, не завершивших действие, через персонализированные касания",
  },
  {
    id: "warmup",
    name: "Прогрев до следующего шага",
    description: "Увеличиваем конверсию через серию касаний с нарастающей ценностью",
  },
  {
    id: "reactivation-stimulate",
    name: "Стимулирование повторной активности",
    description: "Возвращаем интерес пользователей через офферы и релевантные напоминания",
  },
  {
    id: "behavioral-retention",
    name: "Удержание через поведенческие триггеры",
    description: "Предотвращаем отток через своевременные реакции на изменения поведения",
  },
  {
    id: "adaptive-reactivation",
    name: "Реактивация через адаптивный сценарий",
    description: "Перестраиваем коммуникацию по сегментам, реакции и времени отклика пользователей",
  },
];

interface CampaignTypeViewProps {
  onSelect?: (id: string, name: string) => void;
}

export function CampaignTypeView({ onSelect }: CampaignTypeViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-40 pt-10">
      <StepContent title="Выберите кампанию" subtitle="">
        <div className="grid grid-cols-3 gap-3">
          {CAMPAIGNS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect?.(c.id, c.name)}
              className={cn(
                "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
                "border-border bg-card hover:bg-accent hover:border-border"
              )}
            >
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {c.description}
              </span>
            </button>
          ))}
        </div>
      </StepContent>
    </div>
  );
}
