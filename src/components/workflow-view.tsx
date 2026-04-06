// src/components/workflow-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowGraph } from "@/components/workflow-graph";
import { WorkflowStatus } from "@/components/workflow-status";
import {
  createBaseNodes,
  createBaseEdges,
  parseWorkflowCommand,
} from "@/types/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

interface GraphState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowViewProps {
  launched: boolean;
  pendingCommand: string | null;
  onCommandHandled: () => void;
  onGoToStats: () => void;
}

export function WorkflowView({
  launched,
  pendingCommand,
  onCommandHandled,
  onGoToStats,
}: WorkflowViewProps) {
  const [graph, setGraph] = useState<GraphState>({
    nodes: createBaseNodes(),
    edges: createBaseEdges(),
  });
  const [unknownCmd, setUnknownCmd] = useState<string | null>(null);
  const unknownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pendingCommand) return;
    const updater = parseWorkflowCommand(pendingCommand);
    if (updater) {
      setGraph((prev) => updater(prev.nodes, prev.edges));
    } else {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
      setUnknownCmd("Команда не распознана");
      unknownTimerRef.current = setTimeout(() => setUnknownCmd(null), 2500);
    }
    onCommandHandled();
  }, [pendingCommand, onCommandHandled]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {!launched ? (
          <motion.div
            key="graph"
            className="flex flex-1 flex-col"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WorkflowGraph nodes={graph.nodes} edges={graph.edges} />
          </motion.div>
        ) : (
          <WorkflowStatus key="status" onGoToStats={onGoToStats} />
        )}
      </AnimatePresence>

      {/* Unknown command feedback */}
      {unknownCmd && (
        <div className="pointer-events-none absolute bottom-[140px] left-1/2 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          {unknownCmd}
        </div>
      )}
    </div>
  );
}
