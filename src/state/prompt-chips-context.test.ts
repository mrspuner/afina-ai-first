import { describe, it, expect } from "vitest";
import { promptChipsReducer, type PromptChipsState } from "./prompt-chips-context";

const empty: PromptChipsState = { chips: [] };

describe("promptChipsReducer", () => {
  it("push appends a chip and assigns an id", () => {
    const next = promptChipsReducer(empty, {
      type: "push",
      chip: { kind: "trigger", label: "Сайты автодилеров", payload: "auto-dealers", removable: true },
    });
    expect(next.chips).toHaveLength(1);
    expect(next.chips[0].id).toMatch(/^chip_/);
    expect(next.chips[0].label).toBe("Сайты автодилеров");
  });

  it("push with explicit id deduplicates by id (last write wins)", () => {
    const a = promptChipsReducer(empty, {
      type: "push",
      chip: { id: "fixed", kind: "node", label: "Email", payload: "n1", removable: true },
    });
    const b = promptChipsReducer(a, {
      type: "push",
      chip: { id: "fixed", kind: "node", label: "Email 2", payload: "n2", removable: true },
    });
    expect(b.chips).toHaveLength(1);
    expect(b.chips[0].label).toBe("Email 2");
  });

  it("remove drops a chip by id", () => {
    const a = promptChipsReducer(empty, {
      type: "push",
      chip: { id: "x", kind: "trigger", label: "A", payload: null, removable: true },
    });
    const b = promptChipsReducer(a, { type: "remove", id: "x" });
    expect(b.chips).toEqual([]);
  });

  it("removeLastRemovable pops the last removable chip", () => {
    let s = empty;
    s = promptChipsReducer(s, {
      type: "push",
      chip: { kind: "trigger", label: "A", payload: null, removable: false },
    });
    s = promptChipsReducer(s, {
      type: "push",
      chip: { kind: "trigger", label: "B", payload: null, removable: true },
    });
    const next = promptChipsReducer(s, { type: "removeLastRemovable" });
    expect(next.chips.map((c) => c.label)).toEqual(["A"]);
  });

  it("removeLastRemovable is a no-op when there is nothing to remove", () => {
    const s = promptChipsReducer(empty, {
      type: "push",
      chip: { kind: "node", label: "fixed", payload: null, removable: false },
    });
    const next = promptChipsReducer(s, { type: "removeLastRemovable" });
    expect(next).toBe(s);
  });

  it("clear empties chips", () => {
    const a = promptChipsReducer(empty, {
      type: "push",
      chip: { kind: "trigger", label: "A", payload: null, removable: true },
    });
    const b = promptChipsReducer(a, { type: "clear" });
    expect(b.chips).toEqual([]);
  });
});
