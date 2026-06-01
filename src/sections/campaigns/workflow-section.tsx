"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { CanvasHeader, type CanvasHeaderToast } from "./canvas-header";
import { WorkflowView } from "./workflow-view";
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

export function WorkflowSection() {
  const {
    view,
    workflowCommand,
    workflowNodeCommand,
    workflowStructuralCommands,
    workflowNodeFieldPatch,
    selectedWorkflowNode,
    signals,
    campaigns,
  } = useAppState();
  const dispatch = useAppDispatch();

  const graphRef = useRef<GraphSnapshot | null>(null);
  const [graphTick, setGraphTick] = useState(0);
  const [toast, setToast] = useState<CanvasHeaderToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleNodeFieldPatchHandled = useCallback(
    () => dispatch({ type: "workflow_node_field_set_handled" }),
    [dispatch]
  );

  const handleGraphChange = useCallback((g: GraphSnapshot) => {
    graphRef.current = g;
    setGraphTick((v) => v + 1);
  }, []);

  const handleNodeClick = useCallback(
    (id: string, label: string, nodeType?: string) => {
      dispatch({ type: "workflow_node_selected", id, label, nodeType });
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

  // Resolve node-commands to node ids via the current graph snapshot. A command
  // may carry an explicit `nodeId` (node-field/whole-node tag chips from the
  // prompt bar — the field-name label is NOT a node label and would never
  // match) or only a `nodeLabel` (ShellBottomBar segment path). Prefer an exact
  // `nodeId` match; fall back to label resolution otherwise. Commands that
  // resolve to no node are silently skipped.
  const resolvedNodeCommands = useMemo(() => {
    if (!workflowNodeCommand) return null;
    const g = graphRef.current;
    if (!g) return null;
    const resolved: Array<{ nodeId: string; text: string }> = [];
    for (const cmd of workflowNodeCommand.commands) {
      let node: WorkflowNode | undefined;
      if (cmd.nodeId) {
        node = g.nodes.find((n) => n.id === cmd.nodeId);
      }
      if (!node && cmd.nodeLabel) {
        const target = normalizeNodeRef(cmd.nodeLabel);
        node = g.nodes.find(
          (n) =>
            normalizeNodeRef((n.data as WorkflowNodeData).label) === target
        );
      }
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
    // Validation passed — payment (budget + balance) now happens on the
    // dedicated CampaignPaymentScreen. canvas-header "Запустить" becomes a
    // routing hop, not a launch.
    dispatch({
      type: "open_campaign_payment",
      campaignId: currentCampaign.id,
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
        onLaunch={handleLaunch}
        onPause={handlePause}
        onResume={handleResume}
        toast={toast}
        onDismissToast={dismissToast}
        mode={view.launched ? "read-only" : "edit"}
        onBack={
          view.launched
            ? () =>
                dispatch({ type: "campaign_opened", id: currentCampaign.id })
            : undefined
        }
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
          nodeFieldPatch={workflowNodeFieldPatch}
          onNodeFieldPatchHandled={handleNodeFieldPatchHandled}
          selectedNodeId={selectedWorkflowNode?.id ?? null}
          signalType={currentSignal?.type}
          signal={currentSignal ?? undefined}
          onGraphChange={handleGraphChange}
          // Launched campaigns are read-only: nodes still open/expand so the
          // user can inspect the сценарий, but their fields can't be edited
          // (enforced down in NodeCardBody via the read-only context).
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
        />
      </div>

    </div>
  );
}
