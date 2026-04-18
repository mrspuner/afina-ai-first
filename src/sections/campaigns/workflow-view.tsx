// src/components/workflow-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowGraph } from "@/sections/campaigns/workflow-graph";
import { WorkflowStatus } from "@/sections/campaigns/workflow-status";
import {
  createBaseNodes,
  createBaseEdges,
  parseWorkflowCommand,
} from "@/types/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import type { SignalType } from "@/state/app-state";
import { createTemplate } from "@/state/workflow-templates";

interface GraphState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowViewProps {
  launched: boolean;
  pendingCommand: string | null;
  onCommandHandled: () => void;
  nodeCommand?: { nodeId: string; text: string } | null;
  onNodeCommandHandled?: () => void;
  onGoToStats: () => void;
  signalName?: string;
  signalType?: SignalType;
  onGraphChange?: (graph: GraphState) => void;
  onNodeClick?: (id: string, label: string) => void;
  onPaneClick?: () => void;
}

function initialGraph(signalType?: SignalType, signalName?: string): GraphState {
  if (signalType) return createTemplate(signalType);
  return { nodes: createBaseNodes(signalName), edges: createBaseEdges() };
}

function deriveSublabel(text: string): string {
  const delay = text.match(/(\d+)\s*(ч|час)/i);
  if (delay) return `Задержка ${delay[1]} ч`;
  if (/email/i.test(text)) return "Email: обновлено";
  if (/sms/i.test(text)) return "SMS: обновлено";
  if (/push/i.test(text)) return "Push: обновлено";
  if (/ivr|звон/i.test(text)) return "Звонок: обновлено";
  if (/текст|оффер|ссылк/i.test(text)) return "Контент обновлён";
  return "Обновлено по запросу";
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
  onGoToStats,
  signalName,
  signalType,
  onGraphChange,
  onNodeClick,
  onPaneClick,
}: WorkflowViewProps) {
  const [graph, setGraph] = useState<GraphState>(() =>
    initialGraph(signalType, signalName)
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
    if (!nodeCommand) return;
    const { nodeId, text } = nodeCommand;
    const sublabel = deriveSublabel(text);
    setGraph((prev) => ({
      ...prev,
      nodes: patchNode(prev.nodes, nodeId, { processing: true }),
    }));
    const t1 = setTimeout(() => {
      setGraph((prev) => ({
        ...prev,
        nodes: patchNode(prev.nodes, nodeId, {
          processing: false,
          justUpdated: true,
          needsAttention: false,
          sublabel,
        }),
      }));
    }, 1500);
    const t2 = setTimeout(() => {
      setGraph((prev) => ({
        ...prev,
        nodes: patchNode(prev.nodes, nodeId, { justUpdated: false }),
      }));
    }, 2700);
    aiTimersRef.current.push(t1, t2);
    onNodeCommandHandled?.();
  }, [nodeCommand, onNodeCommandHandled]);

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
      {/* Graph — shrinks via CSS height transition when launched */}
      <div
        ref={graphRef}
        style={{
          height: launched ? "55%" : "100%",
          transition: "height 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <WorkflowGraph
          nodes={graph.nodes}
          edges={graph.edges}
          compact={launched}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
        />
      </div>

      {/* Status — fills the remaining 45% */}
      <AnimatePresence>
        {launched && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center pb-[200px]"
          >
            <WorkflowStatus onGoToStats={onGoToStats} />
          </motion.div>
        )}
      </AnimatePresence>

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
