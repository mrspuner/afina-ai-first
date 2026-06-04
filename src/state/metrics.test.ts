import { describe, it, expect } from "vitest";
import {
  addFunnel,
  campaignBaseSends,
  computeFunnel,
  EMPTY_FUNNEL,
  estimateSignalCount,
  formatFunnel,
  makeRng,
  recommendBudget,
  segmentsForSignal,
  signalCountRange,
} from "./metrics";

describe("segmentsForSignal", () => {
  it("always sums to exactly count (карточка = step-8 «найдено»)", () => {
    for (const count of [0, 1, 7, 4312, 49999, 123456]) {
      const s = segmentsForSignal("sig_abc", count);
      expect(s.max + s.high + s.mid + s.low).toBe(count);
    }
  });

  it("is deterministic per id (no drift between renders)", () => {
    expect(segmentsForSignal("sig_x", 8000)).toEqual(
      segmentsForSignal("sig_x", 8000),
    );
  });

  it("differs by id", () => {
    expect(segmentsForSignal("sig_a", 8000)).not.toEqual(
      segmentsForSignal("sig_b", 8000),
    );
  });
});

describe("budget → signal count", () => {
  const segments = ["max", "high", "medium"];

  it("range upper bound equals estimateSignalCount (визард = карточка)", () => {
    const budget = 5000;
    expect(signalCountRange(segments, budget).max).toBe(
      estimateSignalCount(segments, budget),
    );
  });

  it("min ≤ max, both 0 without budget or segments", () => {
    const { min, max } = signalCountRange(segments, 5000);
    expect(min).toBeLessThanOrEqual(max);
    expect(signalCountRange([], 5000)).toEqual({ min: 0, max: 0 });
    expect(signalCountRange(segments, 0)).toEqual({ min: 0, max: 0 });
  });
});

describe("recommendBudget", () => {
  it("is deterministic and never below the 50 floor", () => {
    expect(recommendBudget(40000)).toBe(recommendBudget(40000));
    expect(recommendBudget(1)).toBeGreaterThanOrEqual(50);
    expect(recommendBudget(0)).toBe(0);
  });
});

describe("campaignBaseSends", () => {
  it("never exceeds the source signal count and is deterministic", () => {
    const count = 12000;
    const a = campaignBaseSends("cmp_1", count);
    expect(a).toBeLessThanOrEqual(count);
    expect(a).toBeGreaterThan(0);
    expect(campaignBaseSends("cmp_1", count)).toBe(a);
  });

  it("is 0 without a signal count", () => {
    expect(campaignBaseSends("cmp_1", 0)).toBe(0);
    expect(campaignBaseSends("cmp_1", undefined)).toBe(0);
  });
});

describe("computeFunnel / addFunnel / formatFunnel", () => {
  it("computeFunnel is deterministic and bounded by sends", () => {
    const f = computeFunnel(makeRng(123), 1000);
    expect(f.sends).toBe(1000);
    expect(f.clicks).toBeLessThanOrEqual(f.sends);
    expect(f.actions).toBeLessThanOrEqual(f.sends);
    expect(f.holds + f.approves + f.rejects).toBe(f.actions);
    expect(computeFunnel(makeRng(123), 1000)).toEqual(f);
  });

  it("zero sends yields an empty funnel", () => {
    expect(computeFunnel(makeRng(1), 0)).toEqual(EMPTY_FUNNEL);
  });

  it("addFunnel sums additive metrics", () => {
    const a = computeFunnel(makeRng(1), 1000);
    const b = computeFunnel(makeRng(2), 2000);
    const sum = addFunnel(a, b);
    expect(sum.sends).toBe(a.sends + b.sends);
    expect(sum.approves).toBe(a.approves + b.approves);
    expect(sum.expensesUsd).toBeCloseTo(a.expensesUsd + b.expensesUsd);
  });

  it("formatFunnel recomputes rates from the aggregate", () => {
    const n = { ...EMPTY_FUNNEL, sends: 200, approves: 20, rejects: 10 };
    const d = formatFunnel(n, "rub");
    expect(d.ar).toBe("10.00%");
    expect(d.rr).toBe("5.00%");
    expect(d.sends).toBe(200);
  });
});
