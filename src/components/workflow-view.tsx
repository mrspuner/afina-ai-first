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
  const graphRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to show status after launch
  useEffect(() => {
    if (!launched) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 350);
    return () => clearTimeout(t);
  }, [launched]);

  useEffect(() => {
    return () => {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
    };
  }, []);

  return (
    <div ref={scrollRef} className="relative flex flex-1 flex-col overflow-y-auto">
      {/* Graph — always occupies the full viewport height of the scroll container */}
      <div ref={graphRef} className="flex h-full min-h-[360px] flex-shrink-0 flex-col">
        <WorkflowGraph nodes={graph.nodes} edges={graph.edges} />
      </div>

      {/* Status — appears below the graph */}
      <AnimatePresence>
        {launched && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-shrink-0 flex-col items-center justify-center py-12"
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
