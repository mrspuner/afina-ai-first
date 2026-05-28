import { describe, it, expect } from "vitest";
import { defaultInterestLabels } from "./onboarding-interests-screen";

describe("defaultInterestLabels", () => {
  it("returns labels from the matching vertical (finance)", () => {
    const result = defaultInterestLabels("finance");
    // First four interests of the `finance` vertical, in declaration order,
    // per src/data/triggers-by-vertical.ts.
    expect(result).toEqual([
      "Кредитование",
      "Рассрочка и BNPL",
      "Ипотека",
      "Инвестиции и накопления",
    ]);
  });

  it("falls back to the first vertical when direction id is unknown", () => {
    const fallback = defaultInterestLabels("__nope__");
    expect(fallback.length).toBeGreaterThan(0);
    // Strings, not undefined — this is the regression we're guarding against.
    fallback.forEach((label) => expect(typeof label).toBe("string"));
    fallback.forEach((label) => expect(label.length).toBeGreaterThan(0));
  });

  it("returns at most 4 labels", () => {
    expect(defaultInterestLabels("finance").length).toBeLessThanOrEqual(4);
  });

  it("never returns undefined entries (regression: i.name vs i.label)", () => {
    const result = defaultInterestLabels("finance");
    expect(result.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
  });
});
