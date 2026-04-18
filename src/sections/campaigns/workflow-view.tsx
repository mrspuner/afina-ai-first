// src/components/workflow-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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
  signal?: Signal;
  onGraphChange?: (graph: GraphState) => void;
  onNodeClick?: (id: string, label: string) => void;
  onPaneClick?: () => void;
}

function initialGraph(signalType?: SignalType, signal?: Signal): GraphState {
  if (signalType) return createTemplate(signalType, signal);
  return { nodes: createBaseNodes(), edges: createBaseEdges() };
}

function deriveParamsPatch(
  text: string,
  currentParams: NodeParams | undefined
): { sublabel?: string; paramsPatch?: Partial<NodeParams> } {
  // 1. Duration: "задержка 2 часа", "через 30 минут", "2 дня"
  const durationMatch = text.match(/(\d+)\s*(ч|час|мин|день|дн|дня|дней)/i);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    let hours = amount;
    let unitLabel = "ч";
    if (unit.startsWith("мин")) {
      hours = amount / 60;
      unitLabel = "мин";
    } else if (unit.startsWith("д")) {
      hours = amount * 24;
      unitLabel = unit;
    } else {
      unitLabel = "ч";
    }
    if (currentParams?.kind === "wait") {
      return {
        sublabel: `${amount} ${unitLabel}`,
        paramsPatch: { mode: "duration", durationHours: hours } as Partial<NodeParams>,
      };
    }
    // fallback for non-wait nodes: keep legacy "Задержка N ч" sublabel
    return { sublabel: `Задержка ${amount} ${unitLabel}` };
  }

  // 2. Condition trigger
  const triggerMap: Record<string, { trigger: string; label: string }> = {
    "открыл": { trigger: "opened", label: "Открыл?" },
    "не открыл": { trigger: "not_opened", label: "Не открыл?" },
    "кликнул": { trigger: "clicked", label: "Кликнул?" },
    "не кликнул": { trigger: "not_clicked", label: "Не кликнул?" },
    "доставил": { trigger: "delivered", label: "Доставлено?" },
  };
  for (const [key, val] of Object.entries(triggerMap)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text) && currentParams?.kind === "condition") {
      return {
        sublabel: val.label,
        paramsPatch: { trigger: val.trigger } as Partial<NodeParams>,
      };
    }
  }

  // 3. Text change: "текст: ..." for sms / push / email
  const textChange = text.match(/текст[:\s]+(.+)/i);
  if (textChange && currentParams) {
    const newText = textChange[1].trim();
    if (currentParams.kind === "sms") {
      return {
        sublabel: "Текст обновлён",
        paramsPatch: { text: newText } as Partial<NodeParams>,
      };
    }
    if (currentParams.kind === "email") {
      return {
        sublabel: "Тело обновлено",
        paramsPatch: { body: newText } as Partial<NodeParams>,
      };
    }
    if (currentParams.kind === "push") {
      return {
        sublabel: "Текст обновлён",
        paramsPatch: { body: newText } as Partial<NodeParams>,
      };
    }
  }

  // 4. Link add: "ссылка <url>"
  const linkMatch = text.match(/ссылк[аеу]?\s+(\S+)/i);
  if (linkMatch && currentParams) {
    const link = linkMatch[1];
    if (currentParams.kind === "sms" || currentParams.kind === "email") {
      return {
        sublabel: "Ссылка добавлена",
        paramsPatch: { link } as Partial<NodeParams>,
      };
    }
  }

  // 5. Channel hint fallbacks
  if (/email/i.test(text)) return { sublabel: "Email: обновлено" };
  if (/sms|смс/i.test(text)) return { sublabel: "SMS: обновлено" };
  if (/push/i.test(text)) return { sublabel: "Push: обновлено" };
  if (/ivr|звон/i.test(text)) return { sublabel: "Звонок: обновлено" };
  if (/текст|оффер|ссылк/i.test(text)) return { sublabel: "Контент обновлён" };

  return { sublabel: "Обновлено по запросу" };
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
  signal,
  onGraphChange,
  onNodeClick,
  onPaneClick,
}: WorkflowViewProps) {
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
    if (!nodeCommand) return;
    aiTimersRef.current.forEach(clearTimeout);
    aiTimersRef.current = [];
    const { nodeId, text } = nodeCommand;
    const currentNode = graph.nodes.find((x) => x.id === nodeId);
    const { sublabel, paramsPatch } = deriveParamsPatch(
      text,
      currentNode?.data.params
    );
    setGraph((prev) => ({
      ...prev,
      nodes: patchNode(prev.nodes, nodeId, { processing: true }),
    }));
    const t1 = setTimeout(() => {
      setGraph((prev) => {
        let nodes = patchNode(prev.nodes, nodeId, {
          processing: false,
          justUpdated: true,
          needsAttention: false,
          ...(sublabel ? { sublabel } : {}),
        });
        if (paramsPatch) {
          nodes = patchNodeParams(nodes, nodeId, paramsPatch);
        }
        return { ...prev, nodes };
      });
    }, 1500);
    const t2 = setTimeout(() => {
      setGraph((prev) => ({
        ...prev,
        nodes: patchNode(prev.nodes, nodeId, { justUpdated: false }),
      }));
    }, 2700);
    aiTimersRef.current.push(t1, t2);
    onNodeCommandHandled?.();
    // graph only needs to read current params at start; intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
