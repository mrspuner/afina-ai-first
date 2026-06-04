import { describe, it, expect } from "vitest";
import {
  deriveCampaignFunnel,
  estimateSignalCount,
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

describe("deriveCampaignFunnel", () => {
  it("never sends to more people than the source signal found", () => {
    const count = 12000;
    const funnel = deriveCampaignFunnel("cmp_1", count, "rub");
    expect(funnel.sends).toBeLessThanOrEqual(count);
    expect(funnel.sends).toBeGreaterThan(0);
  });

  it("is deterministic per campaign id", () => {
    expect(deriveCampaignFunnel("cmp_1", 12000, "rub")).toEqual(
      deriveCampaignFunnel("cmp_1", 12000, "rub"),
    );
  });
});
