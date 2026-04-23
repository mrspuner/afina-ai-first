// src/components/workflow-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { WorkflowGraph } from "@/sections/campaigns/workflow-graph";
import {
  createBaseNodes,
  createBaseEdges,
  parseWorkflowCommand,
  patchNodeParams,
} from "@/types/workflow";
import type {
  NodeParams,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
} from "@/types/workflow";
import type { Signal, SignalType } from "@/state/app-state";
import { createTemplate } from "@/state/workflow-templates";
import { matchActions } from "@/state/node-actions";
import {
  applyOps,
  type StructuralOp,
} from "@/state/structural-commands";
import { useAppDispatch } from "@/state/app-state-context";

interface GraphState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowViewProps {
  launched: boolean;
  pendingCommand: string | null;
  onCommandHandled: () => void;
  nodeCommand?: Array<{ nodeId: string; text: string }> | null;
  onNodeCommandHandled?: () => void;
  structuralOps?: StructuralOp[] | null;
  onStructuralOpsHandled?: () => void;
  selectedNodeId?: string | null;
  signalType?: SignalType;
  signal?: Signal;
  onGraphChange?: (graph: GraphState) => void;
  onNodeClick?: (id: string, label: string) => void;
  onPaneClick?: () => void;
}

function initialGraph(signalType?: SignalType, signal?: Signal): GraphState {
  if (signalType) return createTemplate(signalType, signal);
  return { nodes: createBaseNodes(), edges: createBaseEdges() };
}

function computeDynamicSublabel(
  kind: NodeParams["kind"],
  patch: Partial<NodeParams>
): string | null {
  // Wait → show "N ч / N дней / N мин" based on durationHours.
  if (kind === "wait" && "durationHours" in patch && patch.durationHours !== undefined) {
    const h = patch.durationHours as number;
    if (h < 1) return `${Math.round(h * 60)} мин`;
    if (h < 24) return `${h} ч`;
    const days = Math.round(h / 24);
    return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
  }
  // Condition → triggerLabel.
  if (kind === "condition" && "trigger" in patch && patch.trigger !== undefined) {
    const t = patch.trigger as string;
    const map: Record<string, string> = {
      opened: "Открыл?",
      not_opened: "Не открыл?",
      clicked: "Кликнул?",
      not_clicked: "Не кликнул?",
      delivered: "Доставлено?",
      not_delivered: "Не доставлено?",
    };
    return map[t] ?? null;
  }
  // Split → reflect mode.
  if (kind === "split" && "by" in patch && patch.by !== undefined) {
    return patch.by === "segment" ? "По сегменту" : "Случайно";
  }
  return null;
}

function deriveParamsPatch(
  text: string,
  currentParams: NodeParams | undefined
): { sublabel?: string; paramsPatch?: Partial<NodeParams> } {
  // Unified: iterate every NODE_ACTIONS entry for this node kind and merge
  // all matching patches. The sublabel we mutate is intentionally narrow:
  // it stays in sync with a *visible* parameter (wait duration, condition
  // trigger, split mode). For every other field (sms text, email subject,
  // push title, ...) we do NOT overwrite sublabel — the user already sees
  // the real value in the node's params section, and the generic "Текст
  // обновлён" стрингует ноду без пользы.
  if (!currentParams) {
    return {};
  }

  const matched = matchActions(text, currentParams);
  if (matched) {
    const dynamic = computeDynamicSublabel(currentParams.kind, matched.paramsPatch);
    return {
      paramsPatch: matched.paramsPatch,
      ...(dynamic ? { sublabel: dynamic } : {}),
    };
  }

  return {};
}

function patchNode(
  nodes: WorkflowNode[],
  id: string,
  patch: Partial<WorkflowNode["data"]>
): WorkflowNode[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
  );
}

// xyflow stores position as the node's top-left corner. The collapsed card
// is ~130x45, the expanded card is ~320x230. If we only push neighbors, the
// expanded node grows only to the right/down from its anchor — so the right
// neighbor still gets overlapped while the left gap grows too wide. Fix:
// also pull the SELECTED node up-and-left by half the extra size, so its
// visual centre stays put and neighbor shifts land symmetrically around it.
const EXPAND_DX = 100;
const EXPAND_DY = 100;
const SELECTED_RECENTER_X = -95; // ≈ (320 − 130) / 2
const SELECTED_RECENTER_Y = -90; // ≈ (230 − 45) / 2
const AXIS_THRESHOLD = 5;

function shiftNeighborsAround(
  nodes: WorkflowNode[],
  selectedId: string | null | undefined
): WorkflowNode[] {
  if (!selectedId) return nodes.map((n) => ({ ...n, selected: false }));
  const sel = nodes.find((n) => n.id === selectedId);
  if (!sel) return nodes.map((n) => ({ ...n, selected: false }));
  const sx = sel.position.x;
  const sy = sel.position.y;
  return nodes.map((n) => {
    if (n.id === selectedId) {
      return {
        ...n,
        position: {
          x: n.position.x + SELECTED_RECENTER_X,
          y: n.position.y + SELECTED_RECENTER_Y,
        },
        selected: true,
      };
    }
    const dx =
      n.position.x > sx + AXIS_THRESHOLD
        ? EXPAND_DX
        : n.position.x < sx - AXIS_THRESHOLD
          ? -EXPAND_DX
          : 0;
    const dy =
      n.position.y > sy + AXIS_THRESHOLD
        ? EXPAND_DY
        : n.position.y < sy - AXIS_THRESHOLD
          ? -EXPAND_DY
          : 0;
    if (dx === 0 && dy === 0) return { ...n, selected: false };
    return {
      ...n,
      position: { x: n.position.x + dx, y: n.position.y + dy },
      selected: false,
    };
  });
}

export function WorkflowView({
  launched,
  pendingCommand,
  onCommandHandled,
  nodeCommand,
  onNodeCommandHandled,
  structuralOps,
  onStructuralOpsHandled,
  selectedNodeId,
  signalType,
  signal,
  onGraphChange,
  onNodeClick,
  onPaneClick,
}: WorkflowViewProps) {
  const appDispatch = useAppDispatch();
  const [graph, setGraph] = useState<GraphState>(() =>
    initialGraph(signalType, signal)
  );

  useEffect(() => {
    onGraphChange?.(graph);
  }, [graph, onGraphChange]);
  const [unknownCmd, setUnknownCmd] = useState<string | null>(null);
  const unknownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pendingCommand) return;
    const updater = parseWorkflowCommand(pendingCommand);
    if (updater) {
      const el = graphRef.current;
      if (el) {
        el.classList.remove("wf-graph-flash");
        void el.offsetHeight;
        el.classList.add("wf-graph-flash");
      }
      setGraph((prev) => updater(prev.nodes, prev.edges));
    } else {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
      setUnknownCmd("Команда не распознана");
      unknownTimerRef.current = setTimeout(() => setUnknownCmd(null), 2500);
    }
    onCommandHandled();
  }, [pendingCommand, onCommandHandled]);

  type CyclePhase = "idle" | "thinking" | "reveal";
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>("idle");
  const thinkDurationMsRef = useRef(3000);
  const cycleTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const REVEAL_MS = 600;
  const FLASH_MS = 1500;

  // Helper: kicks off a unified cycle that (1) shows "Думаю..." while opacity
  // oscillates, (2) applies a graph mutation at the start of the reveal phase
  // and flashes changed nodes green, (3) returns to idle.
  function runCycle(opts: {
    durationMs: number;
    apply: (prev: GraphState) => { graph: GraphState; changedIds: Set<string> };
    finalReply: string | null;
  }) {
    const { durationMs, apply, finalReply } = opts;
    thinkDurationMsRef.current = durationMs;
    cycleTimersRef.current.forEach(clearTimeout);
    cycleTimersRef.current = [];

    setCyclePhase("thinking");
    appDispatch({ type: "ai_reply_shown", text: "Думаю..." });

    let changedIdsAfter: Set<string> = new Set();
    const t1 = setTimeout(() => {
      setGraph((prev) => {
        const result = apply(prev);
        changedIdsAfter = result.changedIds;
        // Mark changed nodes with justUpdated for the green flash.
        const flashed = result.graph.nodes.map((n) =>
          changedIdsAfter.has(n.id)
            ? { ...n, data: { ...n.data, justUpdated: true } }
            : n
        );
        return { ...result.graph, nodes: flashed };
      });
      setCyclePhase("reveal");
      if (finalReply) appDispatch({ type: "ai_reply_shown", text: finalReply });
    }, durationMs);

    const t2 = setTimeout(() => {
      setCyclePhase("idle");
    }, durationMs + REVEAL_MS);

    const t3 = setTimeout(() => {
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          changedIdsAfter.has(n.id)
            ? { ...n, data: { ...n.data, justUpdated: false } }
            : n
        ),
      }));
    }, durationMs + REVEAL_MS + FLASH_MS);

    cycleTimersRef.current.push(t1, t2, t3);
  }

  useEffect(() => {
    if (!nodeCommand || nodeCommand.length === 0) return;

    // Pre-compute patches against the current graph snapshot so the apply
    // phase has a stable plan.
    const plans = nodeCommand.map(({ nodeId, text }) => {
      const currentNode = graph.nodes.find((x) => x.id === nodeId);
      const { sublabel, paramsPatch } = deriveParamsPatch(
        text,
        currentNode?.data.params
      );
      return { nodeId, sublabel, paramsPatch };
    });

    const opCount = plans.length;
    // 1 node = 3s, 2-3 = 4s, 4+ = 5s.
    const duration = opCount === 1 ? 3000 : opCount <= 3 ? 4000 : 5000;

    const ids = plans.map((p) => p.nodeId).join(", ");
    const finalReply =
      opCount === 1
        ? `Готово, обновил ноду`
        : `Готово, обновил ${opCount} нод`;

    runCycle({
      durationMs: duration,
      apply: (prev) => {
        let nodes = prev.nodes;
        const changedIds = new Set<string>();
        for (const p of plans) {
          nodes = patchNode(nodes, p.nodeId, {
            needsAttention: false,
            attentionReason: undefined,
            ...(p.sublabel ? { sublabel: p.sublabel } : {}),
          });
          if (p.paramsPatch) {
            nodes = patchNodeParams(nodes, p.nodeId, p.paramsPatch);
          }
          changedIds.add(p.nodeId);
        }
        return { graph: { ...prev, nodes }, changedIds };
      },
      finalReply: `${finalReply}: ${ids}.`,
    });

    onNodeCommandHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeCommand, onNodeCommandHandled]);

  useEffect(() => {
    if (!structuralOps || structuralOps.length === 0) return;

    // Pre-compute the resulting graph + diff to know what to flash green.
    const result = applyOps(graph, structuralOps);
    const opCount = result.applied.length;

    function buildReply(): string {
      const lines: string[] = [];
      if (result.applied.length > 0) {
        if (result.applied.length === 1) {
          lines.push(result.applied[0].description);
        } else {
          lines.push("Готово:");
          for (const a of result.applied) lines.push(`• ${a.description}`);
        }
      }
      if (result.skipped.length > 0) {
        lines.push("Не выполнено:");
        for (const s of result.skipped) lines.push(`• ${s.reason}`);
      }
      return lines.join("\n");
    }

    if (opCount === 0) {
      // All skipped — no cycle, just the explanation.
      const reply = buildReply();
      if (reply) appDispatch({ type: "ai_reply_shown", text: reply });
      onStructuralOpsHandled?.();
      return;
    }

    const duration = opCount === 1 ? 3000 : opCount <= 3 ? 4000 : 5000;

    // Diff old → new graph for green flash targets.
    const oldIds = new Set(graph.nodes.map((n) => n.id));
    const oldKindById = new Map(
      graph.nodes.map(
        (n) => [n.id, (n.data as { nodeType: WorkflowNodeType }).nodeType] as const
      )
    );
    const changedIds = new Set<string>();
    for (const n of result.graph.nodes) {
      if (!oldIds.has(n.id)) {
        changedIds.add(n.id);
      } else if (
        oldKindById.get(n.id) !==
        (n.data as { nodeType: WorkflowNodeType }).nodeType
      ) {
        changedIds.add(n.id);
      }
    }

    runCycle({
      durationMs: duration,
      apply: () => ({ graph: result.graph, changedIds }),
      finalReply: buildReply() || null,
    });

    onStructuralOpsHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralOps]);

  useEffect(() => {
    const timers = cycleTimersRef;
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    return () => {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Graph — occupies the full workflow area. Wrapped in motion.div so
          the whole canvas can softly oscillate opacity during a structural
          cycle (mid-cycle the new positions land hidden under the dip). */}
      <motion.div
        ref={graphRef}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
        animate={
          cyclePhase === "thinking"
            ? { opacity: [1, 0.6, 0.3, 0.5, 0.2, 0.4, 0.2], scale: [1, 1, 1, 1, 1, 1, 0.95] }
            : cyclePhase === "reveal"
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: 1 }
        }
        transition={
          cyclePhase === "thinking"
            ? { duration: thinkDurationMsRef.current / 1000, ease: "easeInOut" }
            : cyclePhase === "reveal"
              ? { duration: REVEAL_MS / 1000, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0.3, ease: "easeOut" }
        }
      >
        <WorkflowGraph
          nodes={shiftNeighborsAround(graph.nodes, selectedNodeId)}
          edges={graph.edges}
          compact={launched}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
        />
      </motion.div>

      {/* Unknown command feedback */}
      {unknownCmd && (
        <div className="pointer-events-none absolute bottom-[140px] left-1/2 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          {unknownCmd}
        </div>
      )}

      <style>{`
        @keyframes wf-graph-flash {
          0%   { opacity: 1; }
          25%  { opacity: 0.45; }
          100% { opacity: 1; }
        }
        .wf-graph-flash {
          animation: wf-graph-flash 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
