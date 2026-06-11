import { describe, expect, it } from "vitest";
import { buildDataSummary, statsLinesFromFunnel } from "./data-summary";

const campaign = {
  id: "c1", name: "Ипотека-лето", signalId: "s1", status: "active" as const,
  createdAt: "2026-06-01", budget: 50000, scenario: { id: "x", name: "Горячий интент" },
};
const signal = {
  id: "s1", type: "Первая сделка" as const, name: "Ипотека",
  count: 1200, segments: { max: 100, high: 300, mid: 500, low: 300 },
  createdAt: "2026-06-01", updatedAt: "2026-06-01",
};

describe("buildDataSummary", () => {
  it("включает кампании с именем, статусом и бюджетом", () => {
    const s = buildDataSummary({ campaigns: [campaign], signals: [signal] });
    expect(s).toContain("Ипотека-лето");
    expect(s).toContain("active");
    expect(s).toContain("50000");
    expect(s).toContain("Ипотека");
  });
  it("режет списки до 20 позиций", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...campaign, id: `c${i}`, name: `К${i}` }));
    const s = buildDataSummary({ campaigns: many, signals: [] });
    expect(s).toContain("Кампаний: 30");
    expect(s).not.toContain('"К25"');
  });
  it("statsLines попадают в сводку", () => {
    const s = buildDataSummary({
      campaigns: [], signals: [],
      statsLines: statsLinesFromFunnel({
        sends: 10, clicks: 5, actions: 3, holds: 1, approves: 2, rejects: 0,
        expensesUsd: 100, incomeUsd: 300,
      }),
    });
    expect(s).toContain("доход $300");
  });
});
