"use client";

import { useMemo } from "react";
import { WorkflowGraph } from "@/sections/campaigns/workflow-graph";
import { createTemplate } from "@/state/workflow-templates";
import { createBaseNodes, createBaseEdges } from "@/types/workflow";
import type { SignalType } from "@/state/app-state";

interface WorkflowMiniPreviewProps {
  signalType?: SignalType;
}

/**
 * Non-interactive mini-rendering of a campaign's workflow graph. Reuses the
 * full WorkflowGraph component but wraps it in a small container with
 * pointer-events disabled — clicks pass through to the parent.
 */
export function WorkflowMiniPreview({ signalType }: WorkflowMiniPreviewProps) {
  const graph = useMemo(() => {
    if (signalType) {
      const t = createTemplate(signalType);
      return { nodes: t.nodes, edges: t.edges };
    }
    return { nodes: createBaseNodes(), edges: createBaseEdges() };
  }, [signalType]);

  return (
    <div
      className="pointer-events-none relative h-32 w-full overflow-hidden rounded-lg border border-border bg-card"
      aria-hidden
    >
      <WorkflowGraph nodes={graph.nodes} edges={graph.edges} compact />
    </div>
  );
}
