// src/components/workflow-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { WorkflowGraph } from "@/sections/campaigns/workflow-graph";
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
  signalType?: SignalType;
  onGraphChange?: (graph: GraphState) => void;
  onNodeClick?: (id: string, label: string) => void;
  onPaneClick?: () => void;
}

function initialGraph(signalType?: SignalType): GraphState {
  if (signalType) return createTemplate(signalType);
  return { nodes: createBaseNodes(), edges: createBaseEdges() };
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
  signalType,
  onGraphChange,
  onNodeClick,
  onPaneClick,
}: WorkflowViewProps) {
  const [graph, setGraph] = useState<GraphState>(() =>
    initialGraph(signalType)
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
    aiTimersRef.current.forEach(clearTimeout);
    aiTimersRef.current = [];
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
      {/* Graph — occupies the full workflow area */}
      <div
        ref={graphRef}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
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
