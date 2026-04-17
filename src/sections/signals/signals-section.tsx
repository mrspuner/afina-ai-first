"use client";

import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { SignalTypeView } from "./signal-type-view";

export function SignalsSection() {
  const { signal } = useAppState();
  const dispatch = useAppDispatch();
  return (
    <SignalTypeView
      onCreateSignal={() => dispatch({ type: "start_signal_flow" })}
      signal={
        signal
          ? { scenarioId: signal.scenarioId, count: signal.count, createdAt: signal.createdAt }
          : null
      }
      onLaunchCampaign={() => dispatch({ type: "step2_clicked" })}
    />
  );
}
