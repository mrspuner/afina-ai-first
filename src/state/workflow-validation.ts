import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export type WorkflowValidationError =
  | "no-signal"
  | "needs-attention"
  | "no-success-path";

export interface WorkflowValidation {
  ok: boolean;
  errors: WorkflowValidationError[];
}

export function validateWorkflow(
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
  signalBound: boolean
): WorkflowValidation {
  const errors: WorkflowValidationError[] = [];

  if (!signalBound) errors.push("no-signal");

  if (graph.nodes.some((n) => n.data.needsAttention)) {
    errors.push("needs-attention");
  }

  const successIds = graph.nodes
    .filter((n) => n.data.isSuccess)
    .map((n) => n.id);

  if (successIds.length === 0) {
    errors.push("no-success-path");
  } else {
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      const list = adj.get(e.source) ?? [];
      list.push(e.target);
      adj.set(e.source, list);
    }
    const entry = graph.nodes[0]?.id;
    const seen = new Set<string>();
    if (entry) {
      const queue: string[] = [entry];
      while (queue.length) {
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        for (const next of adj.get(id) ?? []) queue.push(next);
      }
    }
    const reachable = successIds.some((id) => seen.has(id));
    if (!reachable) errors.push("no-success-path");
  }

  return { ok: errors.length === 0, errors };
}
