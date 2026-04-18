"use client";

import { useCallback } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { TYPE_TO_SCENARIO } from "@/state/scenario-map";
import { WorkflowView } from "./workflow-view";

export function WorkflowSection() {
  const { view, workflowCommand, signals, campaigns } = useAppState();
  const dispatch = useAppDispatch();

  const handleCommandHandled = useCallback(
    () => dispatch({ type: "workflow_command_handled" }),
    [dispatch]
  );

  if (view.kind !== "workflow") return null;

  const currentCampaign = campaigns.find((c) => c.id === view.campaign.id) ?? null;
  const currentSignal = currentCampaign
    ? signals.find((s) => s.id === currentCampaign.signalId) ?? null
    : signals[signals.length - 1] ?? null;
  const scenarioId = currentSignal ? TYPE_TO_SCENARIO[currentSignal.type] ?? "registration" : null;
  const signalFileName = scenarioId ? `сигнал_${scenarioId}.json` : undefined;

  return (
    <WorkflowView
      launched={view.launched}
      pendingCommand={workflowCommand}
      onCommandHandled={handleCommandHandled}
      onGoToStats={() => dispatch({ type: "goto_stats" })}
      signalName={signalFileName}
    />
  );
}
