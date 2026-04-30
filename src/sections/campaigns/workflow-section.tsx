"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import Image from "next/image";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { CanvasHeader, type CanvasHeaderToast } from "./canvas-header";
import { WorkflowView } from "./workflow-view";
import { TopUpModal, computeShortfall } from "@/sections/signals/top-up-modal";
import { validateWorkflow } from "@/state/workflow-validation";
import { normalizeNodeRef } from "@/state/structural-commands";
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
    balance,
  } = useAppState();
  const dispatch = useAppDispatch();

  const graphRef = useRef<GraphSnapshot | null>(null);
  const [graphTick, setGraphTick] = useState(0);
  const [toast, setToast] = useState<CanvasHeaderToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Flat prototype cost for launching a campaign — keeps the create-entity →
  // balance-check → top-up → launch mechanic identical between signals and
  // campaigns, per spec.
  const CAMPAIGN_LAUNCH_COST = 500;

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
      const target = normalizeNodeRef(cmd.nodeLabel);
      const node = g.nodes.find(
        (n) =>
          normalizeNodeRef((n.data as WorkflowNodeData).label) === target
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
    // Reuse signal-flow mechanic: balance check → top-up modal → launch.
    if (computeShortfall(balance, CAMPAIGN_LAUNCH_COST) > 0) {
      setTopUpOpen(true);
      return;
    }
    dispatch({
      type: "campaign_status_changed",
      id: currentCampaign.id,
      status: "active",
      timestamp: new Date().toISOString(),
    });
  }

  function handleCampaignTopUpSuccess(amount: number) {
    if (!currentCampaign) return;
    dispatch({ type: "balance_topup", amount });
    dispatch({
      type: "campaign_status_changed",
      id: currentCampaign.id,
      status: "active",
      timestamp: new Date().toISOString(),
    });
    setTopUpOpen(false);
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

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        balance={balance}
        cost={CAMPAIGN_LAUNCH_COST}
        entityLabel={currentCampaign ? currentCampaign.name : undefined}
        onPaymentSuccess={handleCampaignTopUpSuccess}
      />

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
              className="mx-auto flex w-full max-w-2xl items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur-sm"
            >
              <Image
                src="/mascot-icon.svg"
                alt=""
                width={16}
                height={16}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 flex-1 leading-snug">{aiReply}</span>
              <button
                type="button"
                aria-label="Закрыть ответ AI"
                onClick={() => dispatch({ type: "ai_reply_dismissed" })}
                className="-mr-1 rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
