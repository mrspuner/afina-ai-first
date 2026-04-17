"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { cn } from "@/lib/utils";

const INTERESTS = [
  "Недвижимость",
  "Автомобили",
  "Финансовые услуги",
  "Страхование",
  "Путешествия",
  "Электроника",
  "Образование",
  "Здоровье и медицина",
];

const TRIGGERS = [
  "Посещение сайтов конкурентов",
  "Поиск альтернативных предложений",
  "Истечение срока договора",
  "Смена места жительства",
  "Смена работы",
  "Крупная покупка",
  "Оформление кредита",
];

function TagCard({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-sm transition-all",
        selected
          ? "border-primary bg-accent ring-1 ring-primary text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

export function Step2Interests({ data, onNext }: StepProps) {
  const [interests, setInterests] = useState<string[]>(data.interests);
  const [triggers, setTriggers] = useState<string[]>(data.triggers);

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  }

  const canContinue = interests.length > 0 || triggers.length > 0;

  return (
    <StepContent
      title="Какие интересы и триггеры вы ищете?"
      subtitle="Выберите одно или несколько. Если нужного нет — напишите в поле чата"
    >
      <div className="flex flex-col gap-6">
        {/* Interests group */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Интересы
          </p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((item) => (
              <TagCard
                key={item}
                label={item}
                selected={interests.includes(item)}
                onToggle={() => toggle(interests, setInterests, item)}
              />
            ))}
          </div>
        </div>

        {/* Triggers group */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Триггеры
          </p>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map((item) => (
              <TagCard
                key={item}
                label={item}
                selected={triggers.includes(item)}
                onToggle={() => toggle(triggers, setTriggers, item)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Button
            disabled={!canContinue}
            onClick={() => onNext({ interests, triggers })}
          >
            Продолжить
          </Button>
          <p className="text-xs text-muted-foreground">
            Если нужного нет в списке — напишите в поле чата
          </p>
        </div>
      </div>
    </StepContent>
  );
}
