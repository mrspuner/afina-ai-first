import { describe, it, expect } from "vitest";
import { selectSuggestionState } from "./suggestion-state";

describe("selectSuggestionState", () => {
  it("empty bar, no tag, empty queue → welcome suggestions", () => {
    const s = selectSuggestionState({
      hasActiveTag: false, activeTagTypedText: false, queueLength: 0, isWelcome: true,
    });
    expect(s.kind).toBe("welcome");
  });

  it("active tag, no text typed → context suggestions", () => {
    const s = selectSuggestionState({
      hasActiveTag: true, activeTagTypedText: false, queueLength: 0, isWelcome: false,
    });
    expect(s.kind).toBe("context");
  });

  it("non-empty queue, no active tag → apply-all suggestion", () => {
    const s = selectSuggestionState({
      hasActiveTag: false, activeTagTypedText: false, queueLength: 2, isWelcome: false,
    });
    expect(s.kind).toBe("apply-all");
  });

  it("active tag wins over non-empty queue (priority)", () => {
    const s = selectSuggestionState({
      hasActiveTag: true, activeTagTypedText: false, queueLength: 5, isWelcome: false,
    });
    expect(s.kind).toBe("context");
  });

  it("user started typing after the tag → all suggestions hidden", () => {
    const s = selectSuggestionState({
      hasActiveTag: true, activeTagTypedText: true, queueLength: 3, isWelcome: false,
    });
    expect(s.kind).toBe("hidden");
  });

  it("not welcome, no tag, empty queue → hidden", () => {
    const s = selectSuggestionState({
      hasActiveTag: false, activeTagTypedText: false, queueLength: 0, isWelcome: false,
    });
    expect(s.kind).toBe("hidden");
  });
});
