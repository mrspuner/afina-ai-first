"use client";

import { nanoid } from "nanoid";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import type { Signal } from "@/state/app-state";
import { SCENARIO_TO_TYPE } from "@/state/scenario-map";
import { CampaignWorkspace } from "./campaign-workspace";

export function GuidedSignalSection() {
  const { view } = useAppState();
  const dispatch = useAppDispatch();
  const initial = view.kind === "guided-signal" ? view.initialScenario : undefined;

  return (
    <CampaignWorkspace
      onSignalComplete={() => dispatch({ type: "signal_complete" })}
      onStep8Reached={(scenarioId) => {
        const now = new Date().toISOString();
        const signal: Signal = {
          id: `sig_${nanoid(8)}`,
          type: SCENARIO_TO_TYPE[scenarioId] ?? "Регистрация",
          count: 4312,
          segments: { max: 1000, high: 1500, mid: 1200, low: 612 },
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "signal_added", signal });
      }}
      initialScenario={initial}
    />
  );
}
