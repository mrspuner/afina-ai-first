"use client";

import { cn } from "@/lib/utils";
import type { Scenario } from "@/data/scenarios";

interface ScenarioCardProps {
  scenario: Scenario;
  selected?: boolean;
  onClick: (id: string) => void;
}

export function ScenarioCard({ scenario, selected = false, onClick }: ScenarioCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(scenario.id)}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
        selected
          ? "border-brand/50 bg-brand-muted"
          : "border-border bg-card hover:bg-accent hover:border-border"
      )}
    >
      <span className="text-sm font-medium text-foreground">{scenario.name}</span>
      <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {scenario.description}
      </span>
    </button>
  );
}
