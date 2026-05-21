import { describe, it, expect } from "vitest";
import { matchStatsQuery, STATS_DEMO_YEAR } from "./stats-query-matcher";

describe("matchStatsQuery — group-by-campaigns (Q1)", () => {
  it("canonical phrase matches", () => {
    expect(matchStatsQuery("покажи по кампаниям")?.id).toBe("group-by-campaigns");
  });
  it("'покажи мне по кампаниям' matches", () => {
    expect(matchStatsQuery("покажи мне по кампаниям")?.id).toBe("group-by-campaigns");
  });
  it("'сгруппируй по кампаниям' matches", () => {
    expect(matchStatsQuery("сгруппируй по кампаниям")?.id).toBe("group-by-campaigns");
  });
  it("uppercase + ё matches", () => {
    expect(matchStatsQuery("ПОКАЖИ ПО КАМПАНИЯМ")?.id).toBe("group-by-campaigns");
  });
  it("'кампании' alone (no verb) does NOT match", () => {
    expect(matchStatsQuery("кампании")).toBeNull();
  });
});

describe("matchStatsQuery — top-campaigns-income-june (Q2)", () => {
  it("canonical phrase matches", () => {
    expect(matchStatsQuery("топ-10 кампаний по доходу за июнь")?.id).toBe("top-campaigns-income-june");
  });
  it("loose phrasing 'покажи топ кампаний по доходу в июне' matches", () => {
    expect(matchStatsQuery("покажи топ кампаний по доходу в июне")?.id).toBe("top-campaigns-income-june");
  });
  it("'top campaigns income june' (english) matches", () => {
    expect(matchStatsQuery("top campaigns income june")?.id).toBe("top-campaigns-income-june");
  });
  it("Q2 wins over Q1 (priority — Q2 listed first)", () => {
    expect(matchStatsQuery("топ-10 кампаний по доходу за июнь")?.id).toBe("top-campaigns-income-june");
  });
  it("без 'топ' falls through to Q1 if it matches Q1", () => {
    expect(matchStatsQuery("покажи кампании по доходу за июнь")?.id).toBe("group-by-campaigns");
  });
  it("без 'кампани' does NOT match Q2", () => {
    expect(matchStatsQuery("топ-10 по доходу за июнь")).toBeNull();
  });
  it("без 'июн' does NOT match Q2", () => {
    expect(matchStatsQuery("топ-10 кампаний по доходу")).toBeNull();
  });
  it("'июль' instead of 'июнь' does NOT match Q2", () => {
    expect(matchStatsQuery("топ-10 кампаний по доходу за июль")).toBeNull();
  });
});

describe("matchStatsQuery — compare-channels (Q3)", () => {
  it("canonical phrase matches", () => {
    expect(matchStatsQuery("сравни эффективность каналов")?.id).toBe("compare-channels");
  });
  it("'сравни каналы по эффективности' matches", () => {
    expect(matchStatsQuery("сравни каналы по эффективности")?.id).toBe("compare-channels");
  });
  it("без 'канал' does NOT match", () => {
    expect(matchStatsQuery("сравни эффективность")).toBeNull();
  });
  it("без 'сравни' does NOT match", () => {
    expect(matchStatsQuery("эффективность каналов")).toBeNull();
  });
});

describe("matchStatsQuery — normalization", () => {
  it("collapses whitespace", () => {
    expect(matchStatsQuery("покажи    по   кампаниям")?.id).toBe("group-by-campaigns");
  });
  it("strips punctuation", () => {
    expect(matchStatsQuery("покажи, по кампаниям!")?.id).toBe("group-by-campaigns");
  });
  it("treats ё as е", () => {
    expect(matchStatsQuery("сравнЁние каналов и эффективности")?.id).toBe("compare-channels");
  });
});

describe("matchStatsQuery — non-matches", () => {
  it("unrelated text returns null", () => {
    expect(matchStatsQuery("привет, как дела?")).toBeNull();
  });
  it("empty string returns null", () => {
    expect(matchStatsQuery("")).toBeNull();
  });
  it("whitespace-only returns null", () => {
    expect(matchStatsQuery("   ")).toBeNull();
  });
});

describe("STATS_DEMO_YEAR", () => {
  it("equals 2026", () => {
    expect(STATS_DEMO_YEAR).toBe(2026);
  });
});
