// src/components/workflow-view.tsx
"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowGraph } from "@/components/workflow-graph";
import { WorkflowStatus } from "@/components/workflow-status";
import {
  createBaseNodes,
  createBaseEdges,
  parseWorkflowCommand,
} from "@/types/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { useState } from "react";

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
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pendingCommand) return;
    const updater = parseWorkflowCommand(pendingCommand);
    if (updater) {
      // Flash the graph, then apply the update
      const el = graphRef.current;
      if (el) {
        el.classList.remove("wf-graph-flash");
        void el.offsetHeight; // force reflow
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Graph — shrinks when launched to make room for status */}
      <motion.div
        layout
        className="flex flex-col"
        animate={launched ? { flex: "0 0 52%" } : { flex: "1 1 0%" }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        style={{ minHeight: 0 }}
      >
        <div ref={graphRef} className="flex flex-1 flex-col">
          <WorkflowGraph nodes={graph.nodes} edges={graph.edges} />
        </div>
      </motion.div>

      {/* Status — slides in below the graph */}
      <AnimatePresence>
        {launched && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
            className="flex shrink-0 flex-col items-center justify-center py-8"
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
