"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps, TriggerConfig } from "@/types/campaign";
import { useAppState } from "@/state/app-state-context";
import { getDirection, type TriggerSpec } from "@/data/business-directions";
import { cn } from "@/lib/utils";

function InterestChip({
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
          ? "border-primary bg-accent text-foreground ring-1 ring-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function TriggerCard({
  trigger,
  selected,
  config,
  onToggle,
  onConfigChange,
}: {
  trigger: TriggerSpec;
  selected: boolean;
  config: TriggerConfig;
  onToggle: () => void;
  onConfigChange: (next: TriggerConfig) => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border transition-colors",
        selected
          ? "border-primary bg-accent/40 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm"
      >
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background"
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
        <span
          className={cn(
            "flex-1 font-medium",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {trigger.label}
        </span>
      </button>

      {selected && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-3 border-t border-primary/20 bg-background/40 px-3 py-3 [--tw-animation-duration:180ms] [--tw-ease:cubic-bezier(0.23,1,0.32,1)]">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Plus className="h-3 w-3" /> Добавить
            </label>
            <Textarea
              rows={2}
              value={config.add}
              onChange={(e) =>
                onConfigChange({ ...config, add: e.target.value })
              }
              placeholder={trigger.addPlaceholder}
              className="min-h-[52px] text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Minus className="h-3 w-3" /> Исключить
            </label>
            <Textarea
              rows={2}
              value={config.exclude}
              onChange={(e) =>
                onConfigChange({ ...config, exclude: e.target.value })
              }
              placeholder={trigger.excludePlaceholder}
              className="min-h-[52px] text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_CONFIG: TriggerConfig = { add: "", exclude: "" };

export function Step2Interests({ data, onNext }: StepProps) {
  const { clientDirection } = useAppState();
  const direction = useMemo(
    () => getDirection(clientDirection),
    [clientDirection]
  );

  const [interests, setInterests] = useState<string[]>(data.interests);
  const [triggers, setTriggers] = useState<string[]>(data.triggers);
  const [triggerConfig, setTriggerConfig] = useState<
    Record<string, TriggerConfig>
  >(data.triggerConfig ?? {});

  function toggleInterest(item: string) {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function toggleTrigger(item: string) {
    setTriggers((prev) =>
      prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]
    );
  }

  function updateConfig(label: string, next: TriggerConfig) {
    setTriggerConfig((prev) => ({ ...prev, [label]: next }));
  }

  const hasInterest = interests.length > 0;
  const canContinue = hasInterest || triggers.length > 0;

  return (
    <StepContent
      title="Какие интересы и триггеры вы ищете?"
      subtitle={`Направление: ${direction.label}. Выберите интересы и триггеры — у выбранного триггера можно уточнить, что включать и что исключить`}
    >
      <div className="flex flex-col gap-6">
        {/* Interests group */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Интересы
          </p>
          <div className="flex flex-wrap gap-2">
            {direction.interests.map((item) => (
              <InterestChip
                key={item}
                label={item}
                selected={interests.includes(item)}
                onToggle={() => toggleInterest(item)}
              />
            ))}
          </div>
        </div>

        {/* Triggers group */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Триггеры
          </p>
          <div
            className={cn(
              "flex flex-col gap-2 transition-opacity",
              !hasInterest && "pointer-events-none opacity-50"
            )}
          >
            {direction.triggers.map((t) => (
              <TriggerCard
                key={t.label}
                trigger={t}
                selected={triggers.includes(t.label)}
                config={triggerConfig[t.label] ?? EMPTY_CONFIG}
                onToggle={() => toggleTrigger(t.label)}
                onConfigChange={(next) => updateConfig(t.label, next)}
              />
            ))}
          </div>
          {!hasInterest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Сначала выберите хотя бы один интерес — триггеры подстроятся под него
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Button
            disabled={!canContinue}
            onClick={() =>
              onNext({ interests, triggers, triggerConfig })
            }
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
