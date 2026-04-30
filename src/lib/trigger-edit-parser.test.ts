import { describe, expect, it } from "vitest";
import {
  applyEditToDelta,
  EMPTY_DELTA,
  extractDomains,
  isDeltaEmpty,
  parseTriggerCommand,
  removeFromDelta,
  TRIGGER_PARSER_FALLBACK_MESSAGE,
} from "./trigger-edit-parser";

describe("extractDomains", () => {
  it("pulls comma-separated domains", () => {
    expect(extractDomains("a.ru, b.com")).toEqual(["a.ru", "b.com"]);
  });

  it("lowercases and trims trailing punctuation", () => {
    expect(extractDomains("Foo.RU.")).toEqual(["foo.ru"]);
  });

  it("dedupes case-insensitively, preserves first-seen order", () => {
    expect(extractDomains("a.ru b.ru A.RU c.ru")).toEqual([
      "a.ru",
      "b.ru",
      "c.ru",
    ]);
  });

  it("returns empty array for free text without domains", () => {
    expect(extractDomains("привет, как дела")).toEqual([]);
  });
});

describe("parseTriggerCommand", () => {
  it("parses 'добавь d1.ru, d2.ru'", () => {
    const r = parseTriggerCommand("добавь d1.ru, d2.ru");
    expect(r).toEqual({ kind: "edit", add: ["d1.ru", "d2.ru"], exclude: [] });
  });

  it("parses 'исключи d3.ru'", () => {
    const r = parseTriggerCommand("исключи d3.ru");
    expect(r).toEqual({ kind: "edit", add: [], exclude: ["d3.ru"] });
  });

  it("parses combined add + exclude in one prompt", () => {
    const r = parseTriggerCommand(
      "добавь competitor1.ru, competitor2.ru исключи mysite.ru"
    );
    expect(r).toEqual({
      kind: "edit",
      add: ["competitor1.ru", "competitor2.ru"],
      exclude: ["mysite.ru"],
    });
  });

  it("handles 'исключи ... добавь ...' reversed order", () => {
    const r = parseTriggerCommand("исключи bad.ru добавь good.ru");
    expect(r).toEqual({
      kind: "edit",
      add: ["good.ru"],
      exclude: ["bad.ru"],
    });
  });

  it("returns fallback for empty input", () => {
    expect(parseTriggerCommand("  ")).toEqual({
      kind: "fallback",
      message: TRIGGER_PARSER_FALLBACK_MESSAGE,
    });
  });

  it("returns fallback for free-form requests without verbs", () => {
    expect(parseTriggerCommand("найди мне хорошие сайты")).toEqual({
      kind: "fallback",
      message: TRIGGER_PARSER_FALLBACK_MESSAGE,
    });
  });

  it("returns fallback when verb present but no domains", () => {
    expect(parseTriggerCommand("добавь что-нибудь полезное")).toEqual({
      kind: "fallback",
      message: TRIGGER_PARSER_FALLBACK_MESSAGE,
    });
  });

  it("recognises bulk clear-added command", () => {
    expect(parseTriggerCommand("убери всё, что я добавлял")).toEqual({
      kind: "clear-added",
    });
  });

  it("recognises bulk clear-excluded command", () => {
    expect(parseTriggerCommand("верни всё, что я исключал")).toEqual({
      kind: "clear-excluded",
    });
  });
});

describe("applyEditToDelta", () => {
  it("appends added domains to empty delta", () => {
    const next = applyEditToDelta(EMPTY_DELTA, ["a.ru", "b.ru"], []);
    expect(next).toEqual({ added: ["a.ru", "b.ru"], excluded: [] });
  });

  it("merges new added without duplicates", () => {
    const next = applyEditToDelta(
      { added: ["a.ru"], excluded: [] },
      ["A.RU", "b.ru"],
      []
    );
    expect(next).toEqual({ added: ["a.ru", "b.ru"], excluded: [] });
  });

  it("excludes that overlap with adds — exclude wins same-command", () => {
    const next = applyEditToDelta(EMPTY_DELTA, ["a.ru"], ["a.ru"]);
    expect(next).toEqual({ added: [], excluded: ["a.ru"] });
  });

  it("re-adding a previously excluded domain promotes it back", () => {
    const start = { added: [], excluded: ["a.ru"] };
    const next = applyEditToDelta(start, ["a.ru"], []);
    expect(next).toEqual({ added: ["a.ru"], excluded: [] });
  });

  it("re-excluding a previously added domain moves it across", () => {
    const start = { added: ["a.ru"], excluded: [] };
    const next = applyEditToDelta(start, [], ["a.ru"]);
    expect(next).toEqual({ added: [], excluded: ["a.ru"] });
  });
});

describe("removeFromDelta", () => {
  it("removes a domain from `added` case-insensitively", () => {
    const next = removeFromDelta(
      { added: ["a.ru", "b.ru"], excluded: [] },
      "added",
      "A.RU"
    );
    expect(next).toEqual({ added: ["b.ru"], excluded: [] });
  });

  it("removes a domain from `excluded`", () => {
    const next = removeFromDelta(
      { added: [], excluded: ["c.ru"] },
      "excluded",
      "c.ru"
    );
    expect(next).toEqual({ added: [], excluded: [] });
  });
});

describe("isDeltaEmpty", () => {
  it("true for empty delta", () => {
    expect(isDeltaEmpty(EMPTY_DELTA)).toBe(true);
  });
  it("false when added is non-empty", () => {
    expect(isDeltaEmpty({ added: ["a.ru"], excluded: [] })).toBe(false);
  });
  it("false when excluded is non-empty", () => {
    expect(isDeltaEmpty({ added: [], excluded: ["a.ru"] })).toBe(false);
  });
});
