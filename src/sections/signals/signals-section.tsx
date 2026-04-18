"use client";

import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { TYPE_TO_SCENARIO } from "@/state/scenario-map";
import { SignalTypeView } from "./signal-type-view";

export function SignalsSection() {
  const { signals } = useAppState();
  const dispatch = useAppDispatch();
  const latest = signals.length > 0 ? signals[signals.length - 1] : null;
  return (
    <SignalTypeView
      onCreateSignal={() => dispatch({ type: "start_signal_flow" })}
      signal={
        latest
          ? {
              scenarioId: TYPE_TO_SCENARIO[latest.type] ?? "registration",
              count: latest.count,
              createdAt: new Date(latest.createdAt).toLocaleDateString("ru-RU"),
            }
          : null
      }
      onLaunchCampaign={() => dispatch({ type: "step2_clicked" })}
    />
  );
}
