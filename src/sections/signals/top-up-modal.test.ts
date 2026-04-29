import { describe, it, expect } from "vitest";
import { computeShortfall } from "./top-up-modal";

describe("computeShortfall", () => {
  it("returns the difference when balance < cost", () => {
    expect(computeShortfall(100, 250)).toBe(150);
  });

  it("returns 0 when balance equals cost", () => {
    expect(computeShortfall(500, 500)).toBe(0);
  });

  it("returns 0 when balance exceeds cost", () => {
    expect(computeShortfall(1000, 250)).toBe(0);
  });

  it("returns full cost when balance is zero", () => {
    expect(computeShortfall(0, 800)).toBe(800);
  });

  it("handles fractional roubles (kopecks)", () => {
    expect(computeShortfall(99.5, 100)).toBeCloseTo(0.5);
  });

  it("never returns a negative number", () => {
    expect(computeShortfall(2000, -50)).toBe(0);
  });
});
