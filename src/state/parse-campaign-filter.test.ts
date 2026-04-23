import { describe, it, expect } from "vitest";
import { parseCampaignFilter } from "./parse-campaign-filter";

describe("parseCampaignFilter", () => {
  it("parses two statuses separated by comma", () => {
    expect(parseCampaignFilter("завершено, приостановлено")).toEqual([
      "completed",
      "paused",
    ]);
  });

  it("parses statuses joined by 'и'", () => {
    expect(parseCampaignFilter("черновик и запланировано")).toEqual([
      "draft",
      "scheduled",
    ]);
  });

  it("matches russian morphology via stem", () => {
    expect(parseCampaignFilter("активные")).toEqual(["active"]);
    expect(parseCampaignFilter("активна")).toEqual(["active"]);
    expect(parseCampaignFilter("приостановлена")).toEqual(["paused"]);
    expect(parseCampaignFilter("завершённые")).toEqual(["completed"]);
  });

  it("ignores prefix words and pulls statuses out", () => {
    expect(parseCampaignFilter("покажи только активные кампании")).toEqual([
      "active",
    ]);
  });

  it("returns empty when nothing matches", () => {
    expect(parseCampaignFilter("привет")).toEqual([]);
    expect(parseCampaignFilter("")).toEqual([]);
  });

  it("dedupes repeated mentions, preserving first-seen order", () => {
    expect(parseCampaignFilter("активные, активные")).toEqual(["active"]);
    expect(parseCampaignFilter("завершено активно завершено")).toEqual([
      "completed",
      "active",
    ]);
  });

  it("handles latin variants", () => {
    expect(parseCampaignFilter("draft, scheduled")).toEqual([
      "draft",
      "scheduled",
    ]);
  });
});
