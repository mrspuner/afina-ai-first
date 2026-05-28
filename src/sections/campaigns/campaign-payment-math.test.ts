import { describe, it, expect, vi } from "vitest";
import {
  COST_PER_TOUCH,
  estimateTouches,
  recommendCampaignBudget,
} from "./campaign-payment-math";

describe("COST_PER_TOUCH", () => {
  it("equals 5", () => {
    expect(COST_PER_TOUCH).toBe(5);
  });
});

describe("estimateTouches", () => {
  it("returns 0 for budget <= 0", () => {
    expect(estimateTouches(0, 1000)).toBe(0);
    expect(estimateTouches(-50, 1000)).toBe(0);
  });

  it("returns floor(budget / COST_PER_TOUCH) when audience is large", () => {
    // 100 ₽ at 5 ₽/touch → 20 touches; audience plenty.
    expect(estimateTouches(100, 1000)).toBe(20);
  });

  it("caps at audienceSize when budget would buy more touches", () => {
    // 10 000 ₽ would buy 2000 touches at 5 ₽/touch, but audience is 1000.
    expect(estimateTouches(10000, 1000)).toBe(1000);
  });

  it("uses floor for non-divisible budgets", () => {
    // 17 ₽ / 5 ₽ = 3.4 → floor → 3.
    expect(estimateTouches(17, 1000)).toBe(3);
  });

  it("returns 0 when audienceSize is 0", () => {
    expect(estimateTouches(100, 0)).toBe(0);
  });
});

describe("recommendCampaignBudget", () => {
  it("returns at least 50 when audienceSize is 0", () => {
    // Math.random() doesn't matter here — multiplier × 0 = 0, clamped to 50.
    expect(recommendCampaignBudget(0)).toBe(50);
  });

  it("uses fixed multiplier band 0.05..0.45 of audienceSize", () => {
    // Pin random low → 0.05 × audienceSize.
    const lowSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      // 1000 × 0.05 = 50 → max(50, 50) = 50.
      expect(recommendCampaignBudget(1000)).toBe(50);
      // 10000 × 0.05 = 500 → max(50, 500) = 500.
      expect(recommendCampaignBudget(10000)).toBe(500);
    } finally {
      lowSpy.mockRestore();
    }

    // Pin random high → ~0.45 × audienceSize.
    const highSpy = vi.spyOn(Math, "random").mockReturnValue(0.999999);
    try {
      // 1000 × ~0.45 = ~450 → rounded.
      const v = recommendCampaignBudget(1000);
      expect(v).toBeGreaterThanOrEqual(449);
      expect(v).toBeLessThanOrEqual(450);
    } finally {
      highSpy.mockRestore();
    }
  });

  it("rounds to an integer", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.123);
    try {
      const v = recommendCampaignBudget(777);
      expect(Number.isInteger(v)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
