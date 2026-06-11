import { describe, expect, it } from "vitest";
import { validateAiGraph } from "./ai-graph-validation";
import { TEMPLATE_BY_TYPE } from "./workflow-templates";
import { buildGraphFromSpec } from "@/lib/ai/rebuild-schema";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeNode(id: string, nodeType: string, label = id): WorkflowNode {
  return {
    id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: { label, nodeType: nodeType as WorkflowNode["data"]["nodeType"] },
  };
}

function makeEdge(source: string, target: string): WorkflowEdge {
  return { id: `${source}-${target}`, source, target, type: "default" };
}

// ── Base spec from step 3 (rebuild-schema) ─────────────────────────────────────

const rebuildSpec = {
  nodes: [
    { key: "p1", nodeType: "push" as const, label: "Push" },
    { key: "w1", nodeType: "wait" as const, label: "Задержка" },
    { key: "e1", nodeType: "email" as const, label: "Email" },
    { key: "s1", nodeType: "success" as const, label: "Успех" },
    { key: "end1", nodeType: "end" as const, label: "Конец" },
  ],
  edges: [
    { from: "signal", to: "p1" },
    { from: "p1", to: "w1" },
    { from: "w1", to: "e1" },
    { from: "e1", to: "s1" },
    { from: "e1", to: "end1" },
  ],
  assumptions: "Тест",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("validateAiGraph", () => {
  describe("граф из buildGraphFromSpec (шаг 3)", () => {
    it("проходит ok:true", () => {
      const graph = buildGraphFromSpec(rebuildSpec, { label: "Сигнал" });
      const result = validateAiGraph(graph);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("no-end-terminal", () => {
    it("граф без end-ноды НЕ даёт ошибку (проверка намеренно ослаблена)", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("push", "push"),
          makeNode("success", "success"),
        ],
        edges: [makeEdge("signal", "push"), makeEdge("push", "success")],
      };
      const result = validateAiGraph(graph);
      expect(result.errors).not.toContain("no-end-terminal");
    });
  });

  describe("no-success-terminal", () => {
    it("граф без success-ноды → ошибка no-success-terminal", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("push", "push"),
          makeNode("end", "end"),
        ],
        edges: [makeEdge("signal", "push"), makeEdge("push", "end")],
      };
      const result = validateAiGraph(graph);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("no-success-terminal");
    });
  });

  describe("dangling-edge", () => {
    it("ребро в несуществующий id → dangling-edge", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("success", "success"),
        ],
        edges: [
          makeEdge("signal", "success"),
          makeEdge("signal", "nonexistent"),
        ],
      };
      const result = validateAiGraph(graph);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("dangling-edge");
    });
  });

  describe("unreachable-node", () => {
    it("нетерминальная нода без входящих рёбер → unreachable-node", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("push", "push"),   // unreachable non-terminal
          makeNode("email", "email"),
          makeNode("success", "success"),
        ],
        edges: [
          makeEdge("signal", "email"),
          makeEdge("email", "success"),
          // "push" не связан ни с кем
        ],
      };
      const result = validateAiGraph(graph);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("unreachable-node");
    });

    it("terminal-нода (end) без входящих рёбер НЕ даёт unreachable-node (ослабление)", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("email", "email"),
          makeNode("success", "success"),
          makeNode("end-placeholder", "end"),  // terminal placeholder without incoming
        ],
        edges: [
          makeEdge("signal", "email"),
          makeEdge("email", "success"),
        ],
      };
      const result = validateAiGraph(graph);
      expect(result.errors).not.toContain("unreachable-node");
    });
  });

  describe("condition-degree", () => {
    it("condition с 1 исходящим → condition-degree", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("cond", "condition"),
          makeNode("success", "success"),
          makeNode("end", "end"),
        ],
        edges: [
          makeEdge("signal", "cond"),
          makeEdge("cond", "success"),  // только 1 исходящее
          makeEdge("cond", "end"),
          // удаляем одно ребро → сделаем это в отдельном тесте
        ],
      };
      // Здесь condition уже имеет 2 исходящих — проверим с 1
      const graphWith1 = {
        ...graph,
        edges: [
          makeEdge("signal", "cond"),
          makeEdge("cond", "success"),  // только 1 исходящее
        ],
      };
      const result = validateAiGraph(graphWith1);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("condition-degree");
    });

    it("condition ровно с 2 исходящими проходит", () => {
      const graph = {
        nodes: [
          makeNode("signal", "signal"),
          makeNode("cond", "condition"),
          makeNode("success", "success"),
          makeNode("end", "end"),
        ],
        edges: [
          makeEdge("signal", "cond"),
          makeEdge("cond", "success"),
          makeEdge("cond", "end"),
        ],
      };
      const result = validateAiGraph(graph);
      expect(result.errors).not.toContain("condition-degree");
    });
  });

  describe("no-signal-entry", () => {
    it("граф без signal-ноды → no-signal-entry", () => {
      const graph = {
        nodes: [makeNode("push", "push"), makeNode("success", "success")],
        edges: [makeEdge("push", "success")],
      };
      const result = validateAiGraph(graph);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("no-signal-entry");
    });
  });

  // ── Все 6 шаблонов должны проходить ok:true ───────────────────────────────────

  describe("шаблоны TEMPLATE_BY_TYPE", () => {
    const templateKeys = Object.keys(TEMPLATE_BY_TYPE) as Array<keyof typeof TEMPLATE_BY_TYPE>;

    for (const key of templateKeys) {
      it(`шаблон "${key}" → ok:true`, () => {
        const template = TEMPLATE_BY_TYPE[key]();
        const result = validateAiGraph(template);
        expect(result.ok).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    }
  });
});
