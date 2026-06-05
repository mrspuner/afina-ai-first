import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

export type CachedGraph = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

/**
 * Durable per-campaign workflow graph snapshot.
 *
 * The graph (nodes + their edited params/text) lives in WorkflowView's local
 * state. On launch the view flips `workflow → campaign`, which unmounts
 * WorkflowView and destroys that state; reopening rebuilds the graph from the
 * scenario template and silently discards every manual edit. This module-scope
 * cache survives the unmount, so WorkflowView can rehydrate the exact graph the
 * user left — keeping manual edits after launch (and across navigation).
 */
const graphs = new Map<string, CachedGraph>();

export function getCachedGraph(
  campaignId: string | undefined,
): CachedGraph | undefined {
  return campaignId ? graphs.get(campaignId) : undefined;
}

export function setCachedGraph(
  campaignId: string | undefined,
  graph: CachedGraph,
): void {
  if (campaignId) graphs.set(campaignId, graph);
}
