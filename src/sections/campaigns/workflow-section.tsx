"use client";

// Adapter (Block A.5) is gone — signal-type-view removed in Block B.
// TYPE_TO_SCENARIO still resolves a file name for the workflow attachment
// header; will be cleaned up in Block D when Canvas stores its own graph.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { TYPE_TO_SCENARIO } from "@/state/scenario-map";
import { CanvasHeader, type CanvasHeaderToast } from "./canvas-header";
import { NodeControlPanel } from "./node-control-panel";
import { WorkflowView } from "./workflow-view";
import { validateWorkflow } from "@/state/workflow-validation";
import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
} from "@/types/workflow";

type GraphSnapshot = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

const ERROR_TEXT: Record<string, string> = {
  "no-signal": "Сигнал не привязан.",
  "needs-attention": "У вас есть ноды не готовые к запуску.",
  "no-success-path": "Нет пути к ноде Успех.",
};

const TOAST_TIMEOUT_MS = 3000;
const AI_REPLY_TIMEOUT_MS = 5000;

export function WorkflowSection() {
  const {
    view,
    workflowCommand,
    workflowNodeCommand,
    selectedWorkflowNode,
    aiReply,
    signals,
    campaigns,
  } = useAppState();
  const dispatch = useAppDispatch();

  const graphRef = useRef<GraphSnapshot | null>(null);
  const [graphVersion, setGraphVersion] = useState(0);
  const [toast, setToast] = useState<CanvasHeaderToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCommandHandled = useCallback(
    () => dispatch({ type: "workflow_command_handled" }),
    [dispatch]
  );

  const handleNodeCommandHandled = useCallback(
    () => dispatch({ type: "workflow_node_command_handled" }),
    [dispatch]
  );

  const handleGraphChange = useCallback((g: GraphSnapshot) => {
    graphRef.current = g;
    setGraphVersion((v) => v + 1);
  }, []);

  const handleNodeClick = useCallback(
    (id: string, label: string) => {
      dispatch({ type: "workflow_node_selected", id, label });
    },
    [dispatch]
  );

  const handlePaneClick = useCallback(() => {
    dispatch({ type: "workflow_node_deselected" });
  }, [dispatch]);

  const showToast = useCallback((next: CanvasHeaderToast) => {
    setToast(next);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  useEffect(() => {
    if (!aiReply) return;
    if (aiReplyTimerRef.current) clearTimeout(aiReplyTimerRef.current);
    aiReplyTimerRef.current = setTimeout(() => {
      dispatch({ type: "ai_reply_dismissed" });
    }, AI_REPLY_TIMEOUT_MS);
    return () => {
      if (aiReplyTimerRef.current) clearTimeout(aiReplyTimerRef.current);
    };
  }, [aiReply, dispatch]);

  const selectedNode = useMemo(() => {
    if (!selectedWorkflowNode) return null;
    const g = graphRef.current;
    if (!g) return null;
    const node = g.nodes.find((n) => n.id === selectedWorkflowNode.id);
    if (!node) return null;
    return { id: node.id, data: node.data as WorkflowNodeData };
    // graphVersion is included so renders pick up the freshest node data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflowNode, graphVersion]);

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
        nodeCommand={workflowNodeCommand}
        onNodeCommandHandled={handleNodeCommandHandled}
        onGoToStats={() => dispatch({ type: "goto_stats" })}
        signalName={signalFileName}
        signalType={currentSignal?.type}
        onGraphChange={handleGraphChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
      />

      {selectedNode && (
        <NodeControlPanel
          node={selectedNode}
          onClose={() => dispatch({ type: "workflow_node_deselected" })}
        />
      )}

      {aiReply && (
        <div className="pointer-events-auto fixed inset-x-0 bottom-[230px] z-30 px-8">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary shadow">
            <span>AI: {aiReply}</span>
            <button
              type="button"
              aria-label="Закрыть ответ AI"
              onClick={() => dispatch({ type: "ai_reply_dismissed" })}
              className="rounded-md p-1 opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
