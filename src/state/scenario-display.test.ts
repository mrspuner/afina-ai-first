import { describe, it, expect } from "vitest";
import { scenarioNameForSignal, defaultCampaignName } from "./scenario-display";
import type { Signal } from "./app-state";

function sig(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "sig_1",
    type: "Реактивация",
    count: 1000,
    segments: { max: 1, high: 1, mid: 1, low: 1 },
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scenarioNameForSignal", () => {
  it("prefers the wizard scenario id when present", () => {
    const s = sig({ wizardData: { scenario: "cur-sleeping" } as never });
    expect(scenarioNameForSignal(s)).toBe("Спящий клиент");
  });

  it("falls back to the base scenario for the signal type", () => {
    expect(scenarioNameForSignal(sig({ type: "Реактивация" }))).toBe("Реактивация");
  });

  it("falls back to the type string when nothing maps", () => {
    const s = sig({ type: "Несуществующий" as never });
    expect(scenarioNameForSignal(s)).toBe("Несуществующий");
  });
});

describe("defaultCampaignName", () => {
  it("formats as «Сценарий №N»", () => {
    expect(defaultCampaignName("Реактивация", 1)).toBe("Реактивация №1");
    expect(defaultCampaignName("Спящий клиент", 3)).toBe("Спящий клиент №3");
  });
});
