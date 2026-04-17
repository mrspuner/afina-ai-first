"use client";

import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { CampaignWorkspace } from "./campaign-workspace";

export function GuidedSignalSection() {
  const { view } = useAppState();
  const dispatch = useAppDispatch();
  const initial = view.kind === "guided-signal" ? view.initialScenario : undefined;

  return (
    <CampaignWorkspace
      onSignalComplete={() => dispatch({ type: "signal_complete" })}
      onStep8Reached={(scenarioId) =>
        dispatch({ type: "signal_step8_reached", scenarioId })
      }
      initialScenario={initial}
    />
  );
}
