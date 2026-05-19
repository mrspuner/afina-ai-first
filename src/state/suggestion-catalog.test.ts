import { describe, it, expect } from "vitest";
import { getSuggestionsForTag, SUGGESTION_CATALOG } from "./suggestion-catalog";

describe("getSuggestionsForTag", () => {
  it("returns 2-3 suggestions for an sms text field tag", () => {
    const s = getSuggestionsForTag("sms", "Текст");
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.length).toBeLessThanOrEqual(3);
  });

  it("each suggestion has a short label and a longer full text", () => {
    const s = getSuggestionsForTag("sms", "Текст");
    for (const item of s) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.fullText.length).toBeGreaterThanOrEqual(item.label.length);
    }
  });

  it("falls back to whole-node suggestions when paramLabel is omitted", () => {
    const s = getSuggestionsForTag("sms", undefined);
    expect(s.length).toBeGreaterThanOrEqual(2);
  });

  it("returns a generic non-empty set for an unknown node type", () => {
    const s = getSuggestionsForTag("totally-unknown", "Whatever");
    expect(s.length).toBeGreaterThanOrEqual(2);
  });

  it("catalog covers the demo node types sms, email, signal, condition", () => {
    expect(SUGGESTION_CATALOG.sms).toBeDefined();
    expect(SUGGESTION_CATALOG.email).toBeDefined();
    expect(SUGGESTION_CATALOG.signal).toBeDefined();
    expect(SUGGESTION_CATALOG.condition).toBeDefined();
  });

  it("known node type + unknown param falls back to whole-node suggestions", () => {
    const s = getSuggestionsForTag("sms", "НесуществующееПоле");
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s).toEqual(getSuggestionsForTag("sms", undefined));
  });
});
