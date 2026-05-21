"use client";

import { useMemo } from "react";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { Button } from "@/components/ui/button";
import { ScenarioCard } from "@/sections/signals/scenario-card";
import {
  baseScenarios,
  curatedScenarios,
  getScenario,
  scenarioCount,
} from "@/data/scenarios";

export function Step1Scenario({ data, onNext }: StepProps) {
  const { selectedScenarioId } = useAppState();
  const dispatch = useAppDispatch();

  // Safety net: a sidebar-driven entry to the wizard must NOT visually
  // pre-select a scenario — keep step-1 visually pristine until the user
  // picks one themselves.
  const wizardScenario =
    typeof data.scenario === "string" && data.scenario.length > 0
      ? data.scenario
      : null;

  // Visual highlight follows wizard state first, then any catalog-selected
  // scenario that hasn't been committed to the wizard yet.
  const visualScenario = wizardScenario ?? selectedScenarioId;

  const base = baseScenarios();
  const curated = curatedScenarios();

  // If the user picked a scenario in the catalog that isn't in either visible
  // section, surface it as the first card of "Подобрано для вас" — TZ §1.5.
  const curatedDisplay = useMemo(() => {
    if (!selectedScenarioId) return curated;
    const inBase = base.some((s) => s.id === selectedScenarioId);
    const inCurated = curated.some((s) => s.id === selectedScenarioId);
    if (inBase || inCurated) return curated;
    const extra = getScenario(selectedScenarioId);
    return extra ? [extra, ...curated] : curated;
  }, [base, curated, selectedScenarioId]);

  function handleSelect(id: string) {
    onNext({ scenario: id });
  }

  function handleOpenCatalog() {
    dispatch({ type: "catalog_open", returnTo: "wizard-step-1" });
  }

  return (
    <StepContent
      title="Выберите сценарий"
      subtitle="Готовая связка сигнала и кампании под бизнес-цель"
    >
      <div className="flex flex-col gap-6">
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
            Базовые сценарии
          </p>
          <div className="grid auto-rows-fr grid-cols-3 gap-3">
            {base.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                selected={visualScenario === s.id}
                onClick={handleSelect}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
            Подобрано для вас
          </p>
          <div className="grid auto-rows-fr grid-cols-3 gap-3">
            {curatedDisplay.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                selected={visualScenario === s.id}
                onClick={handleSelect}
              />
            ))}
          </div>
        </section>

        <Button
          variant="outline"
          size="default"
          onClick={handleOpenCatalog}
          className="self-start"
        >
          Все {scenarioCount} сценариев →
        </Button>
      </div>
    </StepContent>
  );
}
