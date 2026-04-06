// src/components/workflow-view.tsx
"use client";

import { useEffect, useState } from "react";
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
  // Combined state prevents stale-closure bugs when updater reads both nodes and edges
  const [graph, setGraph] = useState<GraphState>({
    nodes: createBaseNodes(),
    edges: createBaseEdges(),
  });

  // Process incoming command from the shared chat input
  useEffect(() => {
    if (!pendingCommand) return;
    const updater = parseWorkflowCommand(pendingCommand);
    if (updater) {
      setGraph((prev) => updater(prev.nodes, prev.edges));
    }
    onCommandHandled();
  }, [pendingCommand, onCommandHandled]);

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
    </div>
  );
}
