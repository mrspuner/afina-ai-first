import { describe, it, expect } from "vitest";
import { validateWorkflow } from "./workflow-validation";
import { createBaseNodes, createBaseEdges } from "@/types/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

function baseGraph() {
  return { nodes: createBaseNodes("сигнал_test.json"), edges: createBaseEdges() };
}

describe("validateWorkflow", () => {
  it("returns ok for base graph with signal bound", () => {
    const result = validateWorkflow(baseGraph(), true);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports no-signal when signalBound=false", () => {
    const result = validateWorkflow(baseGraph(), false);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("no-signal");
  });

  it("reports needs-attention when any node has the flag", () => {
    const g = baseGraph();
    g.nodes[2].data.needsAttention = true;
    const result = validateWorkflow(g, true);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("needs-attention");
  });

  it("reports no-success-path when no node is isSuccess", () => {
    const g = baseGraph();
    g.nodes = g.nodes.map((n) => ({ ...n, data: { ...n.data, isSuccess: false } }));
    const result = validateWorkflow(g, true);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("no-success-path");
  });

  it("reports no-success-path when success node is unreachable", () => {
    const nodes: WorkflowNode[] = [
      {
        id: "a",
        type: "workflowNode",
        position: { x: 0, y: 0 },
        data: { label: "Start", nodeType: "default" },
      },
      {
        id: "b",
        type: "workflowNode",
        position: { x: 100, y: 0 },
        data: { label: "Detached success", nodeType: "default", isSuccess: true },
      },
    ];
    const edges: WorkflowEdge[] = [];
    const result = validateWorkflow({ nodes, edges }, true);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("no-success-path");
  });

  it("accumulates multiple errors", () => {
    const g = baseGraph();
    g.nodes = g.nodes.map((n) => ({ ...n, data: { ...n.data, isSuccess: false } }));
    const result = validateWorkflow(g, false);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("no-signal");
    expect(result.errors).toContain("no-success-path");
  });
});
