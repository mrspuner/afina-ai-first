import { describe, it, expect } from "vitest";
import { SEGMENTS, selectedSegmentsInOrder } from "./segments-catalog";
import { SEGMENT_PRICES } from "@/state/metrics";

describe("SEGMENTS catalog", () => {
  it("is ordered by descending quality / price", () => {
    expect(SEGMENTS.map((s) => s.id)).toEqual([
      "max",
      "very-high",
      "high",
      "medium",
    ]);
    const prices = SEGMENTS.map((s) => s.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("keeps prices in sync with the engine SEGMENT_PRICES table", () => {
    for (const seg of SEGMENTS) {
      expect(seg.price).toBe(SEGMENT_PRICES[seg.id]);
    }
  });
});

describe("selectedSegmentsInOrder", () => {
  it("returns selected segments sorted by descending quality, regardless of input order", () => {
    const result = selectedSegmentsInOrder(["medium", "max", "high"]);
    expect(result.map((s) => s.id)).toEqual(["max", "high", "medium"]);
  });

  it("ignores unknown segment ids", () => {
    const result = selectedSegmentsInOrder(["max", "bogus"]);
    expect(result.map((s) => s.id)).toEqual(["max"]);
  });

  it("returns an empty array for no selection", () => {
    expect(selectedSegmentsInOrder([])).toEqual([]);
  });
});
