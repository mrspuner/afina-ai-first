import { describe, it, expect } from "vitest";
import {
  parseCampaignFilter,
  parseCampaignQuery,
} from "./parse-campaign-filter";

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

  it("treats 'не запущено' as draft, not active", () => {
    expect(parseCampaignFilter("не запущено")).toEqual(["draft"]);
    expect(parseCampaignFilter("Не запущено")).toEqual(["draft"]);
    expect(parseCampaignFilter("не запущенные")).toEqual(["draft"]);
    expect(parseCampaignFilter("не запущено, активно")).toEqual([
      "draft",
      "active",
    ]);
  });

  it("recognizes every StatusBadge label as its own status", () => {
    expect(parseCampaignFilter("Активно")).toEqual(["active"]);
    expect(parseCampaignFilter("Запланированно")).toEqual(["scheduled"]);
    expect(parseCampaignFilter("Не запущено")).toEqual(["draft"]);
    expect(parseCampaignFilter("Приостановлена")).toEqual(["paused"]);
    expect(parseCampaignFilter("Завершено")).toEqual(["completed"]);
  });
});

describe("parseCampaignQuery", () => {
  it("defaults to empty statuses and default sort", () => {
    expect(parseCampaignQuery("")).toEqual({ statuses: [], sort: "default" });
    expect(parseCampaignQuery("привет")).toEqual({
      statuses: [],
      sort: "default",
    });
  });

  it("detects profit sort", () => {
    expect(parseCampaignQuery("Прибыльные кампании")).toEqual({
      statuses: [],
      sort: "profit-desc",
    });
    expect(parseCampaignQuery("покажи доходные")).toEqual({
      statuses: [],
      sort: "profit-desc",
    });
  });

  it("detects conversion sort", () => {
    expect(parseCampaignQuery("кампании с высокой конверсией")).toEqual({
      statuses: [],
      sort: "conversion-desc",
    });
  });

  it("combines status filter with sort", () => {
    expect(parseCampaignQuery("прибыльные активные")).toEqual({
      statuses: ["active"],
      sort: "profit-desc",
    });
    expect(parseCampaignQuery("завершённые прибыльные")).toEqual({
      statuses: ["completed"],
      sort: "profit-desc",
    });
  });
});
