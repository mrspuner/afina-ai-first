"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { CanvasHeader, type CanvasHeaderToast } from "./canvas-header";
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
    workflowStructuralCommands,
    selectedWorkflowNode,
    aiReply,
    signals,
    campaigns,
  } = useAppState();
  const dispatch = useAppDispatch();

  const graphRef = useRef<GraphSnapshot | null>(null);
  const [graphTick, setGraphTick] = useState(0);
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

  const handleStructuralOpsHandled = useCallback(
    () => dispatch({ type: "workflow_structural_commands_handled" }),
    [dispatch]
  );

  const handleGraphChange = useCallback((g: GraphSnapshot) => {
    graphRef.current = g;
    setGraphTick((v) => v + 1);
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

  // Resolve node-command labels → ids via the current graph snapshot.
  // Tags pointing to unknown labels are silently skipped.
  const resolvedNodeCommands = useMemo(() => {
    if (!workflowNodeCommand) return null;
    const g = graphRef.current;
    if (!g) return null;
    const resolved: Array<{ nodeId: string; text: string }> = [];
    for (const cmd of workflowNodeCommand.commands) {
      const node = g.nodes.find(
        (n) => (n.data as WorkflowNodeData).label === cmd.nodeLabel
      );
      if (node) resolved.push({ nodeId: node.id, text: cmd.text });
    }
    return resolved.length > 0 ? resolved : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowNodeCommand, graphTick]);

  if (view.kind !== "workflow") return null;

  const currentCampaign = campaigns.find((c) => c.id === view.campaign.id) ?? null;
  const currentSignal = currentCampaign
    ? signals.find((s) => s.id === currentCampaign.signalId) ?? null
    : signals[signals.length - 1] ?? null;

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

  function handleSchedule(iso: string) {
    if (!currentCampaign) return;
    dispatch({
      type: "campaign_status_changed",
      id: currentCampaign.id,
      status: "scheduled",
      timestamp: iso,
    });
  }

  function handlePause() {
    if (!currentCampaign) return;
    dispatch({
      type: "campaign_status_changed",
      id: currentCampaign.id,
      status: "paused",
      timestamp: new Date().toISOString(),
    });
  }

  function handleResume() {
    if (!currentCampaign) return;
    dispatch({
      type: "campaign_status_changed",
      id: currentCampaign.id,
      status: "active",
      timestamp: new Date().toISOString(),
    });
  }

  function handleDuplicate() {
    if (!currentCampaign) return;
    dispatch({ type: "campaign_duplicated", id: currentCampaign.id });
  }

  function handleGoToStats() {
    if (!currentCampaign) return;
    dispatch({ type: "goto_stats", campaignId: currentCampaign.id });
  }

  function handleCancelSchedule() {
    if (!currentCampaign) return;
    dispatch({ type: "campaign_schedule_cancelled", id: currentCampaign.id });
  }

  if (!currentCampaign) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Кампания не найдена.
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <CanvasHeader
        campaign={currentCampaign}
        signal={currentSignal}
        onRename={handleRename}
        onSaveDraft={handleSaveDraft}
        onLaunch={handleLaunch}
        onSchedule={handleSchedule}
        onPause={handlePause}
        onResume={handleResume}
        onDuplicate={handleDuplicate}
        onGoToStats={handleGoToStats}
        onCancelSchedule={handleCancelSchedule}
        toast={toast}
        onDismissToast={dismissToast}
      />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <WorkflowView
          key={currentCampaign.id}
          launched={view.launched}
          pendingCommand={workflowCommand}
          onCommandHandled={handleCommandHandled}
          nodeCommand={resolvedNodeCommands}
          onNodeCommandHandled={handleNodeCommandHandled}
          structuralOps={workflowStructuralCommands?.ops ?? null}
          onStructuralOpsHandled={handleStructuralOpsHandled}
          selectedNodeId={selectedWorkflowNode?.id ?? null}
          signalType={currentSignal?.type}
          signal={currentSignal ?? undefined}
          onGraphChange={handleGraphChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
        />
      </div>

      <AnimatePresence>
        {aiReply && (
          <motion.div
            key="ai-reply"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="pointer-events-auto fixed left-[120px] right-0 z-30 px-8"
            style={{ bottom: "calc(var(--promptbar-height, 140px) + 8px)" }}
          >
            <div
              role="status"
              aria-live="polite"
              className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/80">
                  AI
                </p>
                <p className="mt-0.5 text-sm text-foreground">{aiReply}</p>
              </div>
              <button
                type="button"
                aria-label="Закрыть ответ AI"
                onClick={() => dispatch({ type: "ai_reply_dismissed" })}
                className="rounded-md p-1 text-muted-foreground opacity-70 hover:bg-accent hover:text-foreground hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
