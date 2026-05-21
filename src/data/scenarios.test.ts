import { describe, it, expect } from "vitest";
import { SCENARIOS, SCENARIO_CATEGORIES, getScenario, baseScenarios, curatedScenarios, scenarioCount } from "./scenarios";

describe("scenarios library", () => {
  it("has 24 scenarios", () => {
    expect(SCENARIOS).toHaveLength(24);
    expect(scenarioCount).toBe(24);
  });
  it("has 6 base scenarios", () => {
    expect(baseScenarios()).toHaveLength(6);
    expect(baseScenarios().every((s) => s.isBase)).toBe(true);
  });
  it("has 4 curated scenarios, none of them base", () => {
    expect(curatedScenarios()).toHaveLength(4);
    expect(curatedScenarios().every((s) => s.isCurated && !s.isBase)).toBe(true);
  });
  it("every scenario has a unique id", () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    expect(ids.size).toBe(24);
  });
  it("every scenario.signalType is a valid SignalType", () => {
    const valid = ["Регистрация", "Первая сделка", "Апсейл", "Реактивация", "Возврат", "Удержание"];
    expect(SCENARIOS.every((s) => valid.includes(s.signalType))).toBe(true);
  });
  it("every scenario.category is a known category", () => {
    expect(SCENARIOS.every((s) => SCENARIO_CATEGORIES.includes(s.category))).toBe(true);
  });
  it("getScenario returns by id, undefined for unknown", () => {
    expect(getScenario(SCENARIOS[0].id)?.id).toBe(SCENARIOS[0].id);
    expect(getScenario("nope")).toBeUndefined();
  });
});
