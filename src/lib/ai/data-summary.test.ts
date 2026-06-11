import { describe, expect, it } from "vitest";
import { buildDataSummary, statsLinesFromFunnel, buildStatsLines } from "./data-summary";

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

describe("buildStatsLines", () => {
  const now = new Date(2026, 5, 15); // 15 Jun 2026

  const campaigns = [
    {
      id: "c1", name: "Ипотека-лето", signalId: "s1", status: "active" as const,
      createdAt: "2026-01-10", launchedAt: "2026-01-12",
    },
    {
      id: "c2", name: "Автокредит", signalId: "s2", status: "completed" as const,
      createdAt: "2026-02-01", launchedAt: "2026-02-05", completedAt: "2026-03-20",
    },
  ];

  it("возвращает ровно 2 строки", () => {
    const lines = buildStatsLines(campaigns, now);
    expect(lines).toHaveLength(2);
  });

  it("обе строки содержат числа", () => {
    const lines = buildStatsLines(campaigns, now);
    expect(lines[0]).toMatch(/\d+/);
    expect(lines[1]).toMatch(/\d+/);
  });

  it("первая строка упоминает отправки", () => {
    const lines = buildStatsLines(campaigns, now);
    expect(lines[0]).toContain("отправок");
  });

  it("вторая строка упоминает деньги", () => {
    const lines = buildStatsLines(campaigns, now);
    expect(lines[1]).toContain("доход");
  });

  it("пустой список кампаний — нули в строках", () => {
    const lines = buildStatsLines([], now);
    expect(lines[0]).toContain("отправок 0");
  });
});
