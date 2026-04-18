"use client";

// Adapter (Block A.5) is gone — signal-type-view removed in Block B.
// TYPE_TO_SCENARIO still resolves a file name for the workflow attachment
// header; will be cleaned up in Block D when Canvas stores its own graph.

import { useCallback, useRef, useState } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { TYPE_TO_SCENARIO } from "@/state/scenario-map";
import { CanvasHeader, type CanvasHeaderToast } from "./canvas-header";
import { WorkflowView } from "./workflow-view";
import { validateWorkflow } from "@/state/workflow-validation";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

type GraphSnapshot = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

const ERROR_TEXT: Record<string, string> = {
  "no-signal": "Сигнал не привязан.",
  "needs-attention": "У вас есть ноды не готовые к запуску.",
  "no-success-path": "Нет пути к ноде Успех.",
};

const TOAST_TIMEOUT_MS = 3000;

export function WorkflowSection() {
  const { view, workflowCommand, signals, campaigns } = useAppState();
  const dispatch = useAppDispatch();

  const graphRef = useRef<GraphSnapshot | null>(null);
  const [toast, setToast] = useState<CanvasHeaderToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCommandHandled = useCallback(
    () => dispatch({ type: "workflow_command_handled" }),
    [dispatch]
  );

  const handleGraphChange = useCallback((g: GraphSnapshot) => {
    graphRef.current = g;
  }, []);

  const showToast = useCallback((next: CanvasHeaderToast) => {
    setToast(next);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  if (view.kind !== "workflow") return null;

  const currentCampaign = campaigns.find((c) => c.id === view.campaign.id) ?? null;
  const currentSignal = currentCampaign
    ? signals.find((s) => s.id === currentCampaign.signalId) ?? null
    : signals[signals.length - 1] ?? null;
  const scenarioId = currentSignal ? TYPE_TO_SCENARIO[currentSignal.type] ?? "registration" : null;
  const signalFileName = scenarioId ? `сигнал_${scenarioId}.json` : undefined;

  function handleRename(name: string) {
    if (!currentCampaign) return;
    dispatch({ type: "campaign_renamed", id: currentCampaign.id, name });
  }

  function handleSaveDraft() {
    if (!currentCampaign) return;
    dispatch({ type: "campaign_saved_draft", id: currentCampaign.id });
    showToast({ kind: "info", text: "Черновик сохранён" });
  }

  function handleLaunch() {
    if (!currentCampaign) return;
    const graph = graphRef.current;
    if (!graph) {
      showToast({ kind: "error", text: "Граф ещё не готов, попробуйте снова." });
      return;
    }
    const result = validateWorkflow(graph, Boolean(currentSignal));
    if (!result.ok) {
      showToast({
        kind: "error",
        text: ERROR_TEXT[result.errors[0]] ?? "Не готово к запуску.",
      });
      return;
    }
    dispatch({
      type: "campaign_status_changed",
      id: currentCampaign.id,
      status: "active",
      timestamp: new Date().toISOString(),
    });
  }

  if (!currentCampaign) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Кампания не найдена.
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <CanvasHeader
        campaign={currentCampaign}
        signal={currentSignal}
        onRename={handleRename}
        onSaveDraft={handleSaveDraft}
        onLaunch={handleLaunch}
        toast={toast}
        onDismissToast={dismissToast}
      />
      <WorkflowView
        launched={view.launched}
        pendingCommand={workflowCommand}
        onCommandHandled={handleCommandHandled}
        onGoToStats={() => dispatch({ type: "goto_stats" })}
        signalName={signalFileName}
        onGraphChange={handleGraphChange}
      />
    </div>
  );
}
