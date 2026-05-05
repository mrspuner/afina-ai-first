// src/lib/random-remix.test.ts
import { describe, it, expect } from "vitest";
import { computeRandomRemix } from "./random-remix";

const VERTICAL = {
  interestIds: ["i1", "i2", "i3", "i4"],
  triggerIdsByInterest: {
    i1: ["t1a", "t1b"],
    i2: ["t2a"],
    i3: ["t3a", "t3b"],
    i4: ["t4a"],
  },
  domainsByTrigger: {
    t1a: ["a.ru", "b.ru", "c.ru"],
    t1b: ["d.ru"],
    t2a: ["e.ru", "f.ru"],
    t3a: ["g.ru"],
    t3b: ["h.ru", "i.ru"],
    t4a: ["j.ru"],
  },
};

describe("computeRandomRemix", () => {
  it("детерминирована при одном и том же seed", () => {
    const a = computeRandomRemix(VERTICAL, 42);
    const b = computeRandomRemix(VERTICAL, 42);
    expect(a).toEqual(b);
  });

  it("выдаёт разный результат при разных seed", () => {
    const a = computeRandomRemix(VERTICAL, 1);
    const b = computeRandomRemix(VERTICAL, 999);
    expect(a).not.toEqual(b);
  });

  it("выбирает не пустой список интересов и связанные триггеры", () => {
    const r = computeRandomRemix(VERTICAL, 42);
    expect(r.interestIds.length).toBeGreaterThan(0);
    expect(r.triggerIds.length).toBeGreaterThan(0);
    for (const tid of r.triggerIds) {
      const interestForTrigger = Object.entries(VERTICAL.triggerIdsByInterest)
        .find(([, ts]) => ts.includes(tid))?.[0];
      expect(interestForTrigger).toBeDefined();
      expect(r.interestIds).toContain(interestForTrigger!);
    }
  });

  it("формирует deltas только для подмножества выбранных триггеров", () => {
    const r = computeRandomRemix(VERTICAL, 7);
    for (const tid of Object.keys(r.deltas)) {
      expect(r.triggerIds).toContain(tid);
    }
  });
});
