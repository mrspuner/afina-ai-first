import { describe, it, expect } from "vitest";
import { aggregate, buildFacts, groupFacts, type StatsContext } from "./fact-cube";
import type { DateRange } from "./period-utils";

// Fixed "now" so campaign windows and the period are deterministic.
const NOW = new Date(2026, 5, 15); // 15 Jun 2026
const PERIOD: DateRange = {
  from: new Date(2026, 3, 1), // 01 Apr
  to: new Date(2026, 5, 30), // 30 Jun
};

function iso(y: number, m: number, d: number): string {
  return new Date(y, m, d).toISOString();
}

const CTX: StatsContext = {
  signals: [
    { id: "sig_a", count: 40000 },
    { id: "sig_b", count: 12000 },
  ],
  campaigns: [
    {
      id: "cmp_a",
      name: "Кампания A",
      signalId: "sig_a",
      status: "active",
      createdAt: iso(2026, 3, 10),
      launchedAt: iso(2026, 3, 12),
      scenario: { id: "scn-1", name: "Регистрация" },
    },
    {
      id: "cmp_b",
      name: "Кампания B",
      signalId: "sig_b",
      status: "completed",
      createdAt: iso(2026, 3, 1),
      launchedAt: iso(2026, 4, 5),
      completedAt: iso(2026, 4, 20),
    },
  ],
};

const ADDITIVE = [
  "sends",
  "clicks",
  "actions",
  "holds",
  "approves",
  "rejects",
] as const;

describe("buildFacts — околореальные дни", () => {
  it("кампания, запущенная сегодня, даёт ровно один активный день", () => {
    const ctx: StatsContext = {
      signals: [{ id: "s", count: 5000 }],
      campaigns: [
        {
          id: "c",
          name: "Сегодня",
          signalId: "s",
          status: "active",
          createdAt: NOW.toISOString(),
          launchedAt: NOW.toISOString(),
        },
      ],
    };
    const facts = buildFacts(ctx, PERIOD, { now: NOW });
    const days = new Set(facts.map((f) => f.date.toISOString().slice(0, 10)));
    expect(days.size).toBe(1);
    expect([...days][0]).toBe(NOW.toISOString().slice(0, 10));
  });

  it("активные дни = длине пересечения окна кампании и периода", () => {
    // cmp_b: 05 Apr → 20 Apr completed = 16 дней, целиком внутри периода.
    const facts = buildFacts(CTX, PERIOD, { now: NOW, campaignId: "cmp_b" });
    const days = new Set(facts.map((f) => f.date.toISOString().slice(0, 10)));
    expect(days.size).toBe(16);
  });

  it("кампания вне периода не даёт фактов", () => {
    const ctx: StatsContext = {
      signals: [{ id: "s", count: 5000 }],
      campaigns: [
        {
          id: "c",
          name: "Старая",
          signalId: "s",
          status: "completed",
          createdAt: iso(2025, 0, 1),
          launchedAt: iso(2025, 0, 5),
          completedAt: iso(2025, 0, 20),
        },
      ],
    };
    expect(buildFacts(ctx, PERIOD, { now: NOW })).toHaveLength(0);
  });

  it("draft-кампании не попадают в куб", () => {
    const ctx: StatsContext = {
      signals: [{ id: "s", count: 5000 }],
      campaigns: [
        {
          id: "c",
          name: "Черновик",
          signalId: "s",
          status: "draft",
          createdAt: NOW.toISOString(),
        },
      ],
    };
    expect(buildFacts(ctx, PERIOD, { now: NOW })).toHaveLength(0);
  });
});

describe("cube invariants", () => {
  const facts = buildFacts(CTX, PERIOD, { now: NOW });

  it("кампания не отправляет больше, чем count её сигнала", () => {
    const a = aggregate(
      groupFacts(facts, "campaigns").find((g) => g.key === "cmp-cmp_a")!.facts,
    );
    expect(a.sends).toBeLessThanOrEqual(40000);
  });

  it("подстроки суммируются в родителя по аддитивным колонкам", () => {
    for (const parent of groupFacts(facts, "campaigns")) {
      const parentAgg = aggregate(parent.facts);
      const subAgg = groupFacts(parent.facts, "channels").reduce(
        (acc, sg) => {
          const a = aggregate(sg.facts);
          for (const k of ADDITIVE) acc[k] += a[k];
          return acc;
        },
        { sends: 0, clicks: 0, actions: 0, holds: 0, approves: 0, rejects: 0 } as Record<
          (typeof ADDITIVE)[number],
          number
        >,
      );
      for (const k of ADDITIVE) expect(subAgg[k]).toBe(parentAgg[k]);
    }
  });

  it("общий итог не зависит от выбора разреза (инвариант куба)", () => {
    const byDays = aggregate(facts);
    for (const dim of ["campaigns", "channels", "scenarios", "weekdays"] as const) {
      const total = groupFacts(facts, dim).reduce(
        (acc, g) => {
          const a = aggregate(g.facts);
          for (const k of ADDITIVE) acc[k] += a[k];
          return acc;
        },
        { sends: 0, clicks: 0, actions: 0, holds: 0, approves: 0, rejects: 0 } as Record<
          (typeof ADDITIVE)[number],
          number
        >,
      );
      for (const k of ADDITIVE) expect(total[k]).toBe(byDays[k]);
    }
  });

  it("детерминизм: повторный вызов даёт те же числа", () => {
    const again = buildFacts(CTX, PERIOD, { now: NOW });
    expect(aggregate(again)).toEqual(aggregate(facts));
  });

  it("каждый факт несёт значение по каждому измерению", () => {
    for (const f of facts.slice(0, 50)) {
      for (const dim of [
        "campaigns",
        "scenarios",
        "channels",
        "creatives",
        "offers",
        "landings",
        "subscribers",
        "triggers",
        "strategies",
        "advertisers",
        "traffic-suppliers",
      ] as const) {
        expect(f.dims[dim]?.label).toBeTruthy();
      }
    }
  });
});
