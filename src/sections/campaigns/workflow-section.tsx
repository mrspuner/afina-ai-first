"use client";

import { useCallback } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { WorkflowView } from "./workflow-view";

export function WorkflowSection() {
  const { view, workflowCommand, signal } = useAppState();
  const dispatch = useAppDispatch();

  const handleCommandHandled = useCallback(
    () => dispatch({ type: "workflow_command_handled" }),
    [dispatch]
  );

  if (view.kind !== "workflow") return null;

  const signalFileName = signal ? `сигнал_${signal.scenarioId}.json` : undefined;

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
