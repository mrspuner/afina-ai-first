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
import type { NodeParams, WorkflowNode, WorkflowEdge } from "@/types/workflow";
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

  const aiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!nodeCommand || nodeCommand.length === 0) return;
    aiTimersRef.current.forEach(clearTimeout);
    aiTimersRef.current = [];

    // Pre-compute patches for each command against current graph snapshot.
    const plans = nodeCommand.map(({ nodeId, text }) => {
      const currentNode = graph.nodes.find((x) => x.id === nodeId);
      const { sublabel, paramsPatch } = deriveParamsPatch(
        text,
        currentNode?.data.params
      );
      return { nodeId, sublabel, paramsPatch };
    });

    // Phase 0 — mark every targeted node as processing.
    setGraph((prev) => {
      let nodes = prev.nodes;
      for (const p of plans) {
        nodes = patchNode(nodes, p.nodeId, { processing: true });
      }
      return { ...prev, nodes };
    });

    // Phase 1 (t=1000ms) — flip to justUpdated + apply sublabel/params.
    const t1 = setTimeout(() => {
      setGraph((prev) => {
        let nodes = prev.nodes;
        for (const p of plans) {
          nodes = patchNode(nodes, p.nodeId, {
            processing: false,
            justUpdated: true,
            needsAttention: false,
            ...(p.sublabel ? { sublabel: p.sublabel } : {}),
          });
          if (p.paramsPatch) {
            nodes = patchNodeParams(nodes, p.nodeId, p.paramsPatch);
          }
        }
        return { ...prev, nodes };
      });
    }, 1000);

    // Phase 2 (t=2200ms) — clear justUpdated flash.
    const t2 = setTimeout(() => {
      setGraph((prev) => {
        let nodes = prev.nodes;
        for (const p of plans) {
          nodes = patchNode(nodes, p.nodeId, { justUpdated: false });
        }
        return { ...prev, nodes };
      });
    }, 2200);

    aiTimersRef.current.push(t1, t2);
    onNodeCommandHandled?.();
    // graph only needs to read current params at start; intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeCommand, onNodeCommandHandled]);

  const [structuralCycleActive, setStructuralCycleActive] = useState(false);
  const cycleDurationMsRef = useRef(3000);
  const cycleTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!structuralOps || structuralOps.length === 0) return;

    // Compute the result up-front so we know how big the change is and can
    // pick an animation duration. The actual setGraph happens immediately
    // (so the user sees the new graph through the opacity dip) — the cycle
    // animation runs over the new state.
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
      // Everything skipped — no animation, just the explanation.
      const reply = buildReply();
      if (reply) appDispatch({ type: "ai_reply_shown", text: reply });
      onStructuralOpsHandled?.();
      return;
    }

    // Pick a duration that scales with the size of the change.
    // 1 op → 3s, 2-3 → 4s, 4+ → 5s. Stays in the user's 3-6s window.
    const duration = opCount === 1 ? 3000 : opCount <= 3 ? 4000 : 5000;
    cycleDurationMsRef.current = duration;

    // Diff old vs new graph to know which nodes to flash green.
    const oldIds = new Set(graph.nodes.map((n) => n.id));
    const oldKindById = new Map(
      graph.nodes.map(
        (n) => [n.id, (n.data as { nodeType: WorkflowNodeType }).nodeType] as const
      )
    );
    const changedIds = new Set<string>();
    for (const n of result.graph.nodes) {
      if (!oldIds.has(n.id)) {
        changedIds.add(n.id); // freshly added
      } else if (
        oldKindById.get(n.id) !==
        (n.data as { nodeType: WorkflowNodeType }).nodeType
      ) {
        changedIds.add(n.id); // replaced
      }
    }

    // Apply graph immediately. The opacity oscillation runs over the new
    // layout — the dip masks the position re-flow.
    setGraph(result.graph);
    setStructuralCycleActive(true);
    appDispatch({ type: "ai_reply_shown", text: "Думаю..." });

    // Clear any in-flight cycle timers.
    cycleTimersRef.current.forEach(clearTimeout);
    cycleTimersRef.current = [];

    const t1 = setTimeout(() => {
      setStructuralCycleActive(false);
      // Mark changed nodes with justUpdated for the green flash.
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          changedIds.has(n.id)
            ? { ...n, data: { ...n.data, justUpdated: true } }
            : n
        ),
      }));
      const reply = buildReply();
      if (reply) appDispatch({ type: "ai_reply_shown", text: reply });
    }, duration);

    const t2 = setTimeout(() => {
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          changedIds.has(n.id)
            ? { ...n, data: { ...n.data, justUpdated: false } }
            : n
        ),
      }));
    }, duration + 1500);

    cycleTimersRef.current.push(t1, t2);
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
    const timers = aiTimersRef;
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
          structuralCycleActive
            ? { opacity: [1, 0.4, 0.7, 0.4, 0.7, 1] }
            : { opacity: 1 }
        }
        transition={{
          duration: structuralCycleActive
            ? cycleDurationMsRef.current / 1000
            : 0.3,
          ease: "easeInOut",
        }}
      >
        <WorkflowGraph
          nodes={graph.nodes.map((n) =>
            n.id === selectedNodeId ? { ...n, selected: true } : { ...n, selected: false }
          )}
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
