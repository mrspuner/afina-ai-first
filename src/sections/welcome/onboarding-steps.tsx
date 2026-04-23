"use client";

import { ChevronRight } from "lucide-react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import {
  isStep1Active,
  isStep2Active,
  isStep3Active,
} from "@/state/app-state";
import { cn } from "@/lib/utils";

export function OnboardingSteps() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const items = [
    {
      n: 1,
      label: "Получение сигнала",
      active: isStep1Active(state),
      onClick: isStep1Active(state)
        ? () => dispatch({ type: "start_signal_flow" })
        : undefined,
    },
    {
      n: 2,
      label: "Запуск кампании",
      active: isStep2Active(state),
      onClick: isStep2Active(state)
        ? () => dispatch({ type: "step2_clicked" })
        : undefined,
    },
    {
      n: 3,
      label: "Статистика кампании",
      active: isStep3Active(state),
      onClick: undefined,
    },
  ] as const;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map(({ n, label, active, onClick }) => (
        <button
          key={n}
          type="button"
          disabled={!active}
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
            active
              ? onClick
                ? "cursor-pointer border-border bg-card hover:bg-accent"
                : "cursor-default border-border bg-card"
              : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
          )}
        >
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
            Шаг {n}
          </span>
          <div className="h-3 w-px shrink-0 bg-border" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          {active && onClick && (
            <ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      ))}
    </div>
  );
}
