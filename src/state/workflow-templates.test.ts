import { describe, it, expect } from "vitest";
import { TEMPLATE_BY_TYPE, createTemplate } from "./workflow-templates";
import { validateWorkflow } from "./workflow-validation";
import type { SignalType } from "./app-state";

const SIGNAL_TYPES: SignalType[] = [
  "Регистрация",
  "Первая сделка",
  "Апсейл",
  "Реактивация",
  "Возврат",
  "Удержание",
];

describe("workflow templates", () => {
  it.each(SIGNAL_TYPES)("creates a valid template for %s", (type) => {
    const t = createTemplate(type);
    expect(t.nodes.length).toBeGreaterThan(2);

    // at least one success node
    const successNodes = t.nodes.filter((n) => n.data.isSuccess);
    expect(successNodes.length).toBeGreaterThanOrEqual(1);

    // all ids unique
    const ids = t.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);

    // edges reference existing nodes
    const idSet = new Set(ids);
    for (const edge of t.edges) {
      expect(idSet.has(edge.source)).toBe(true);
      expect(idSet.has(edge.target)).toBe(true);
    }

    // graph validates ok with signal bound
    const v = validateWorkflow(t, true);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it("exports all 6 types in TEMPLATE_BY_TYPE", () => {
    expect(Object.keys(TEMPLATE_BY_TYPE)).toHaveLength(6);
    for (const type of SIGNAL_TYPES) {
      expect(TEMPLATE_BY_TYPE[type]).toBeTypeOf("function");
    }
  });
});
