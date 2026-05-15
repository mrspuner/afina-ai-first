import { describe, it, expect } from "vitest";
import { decideEnterAction, APPLY_ALL_COMMAND } from "./prompt-bar-enter";

describe("decideEnterAction", () => {
  it("fresh tag with text → apply immediately to the node", () => {
    const r = decideEnterAction({ hasActiveTag: true, activeTagFromQueue: false, activeText: "сделай дружелюбнее", queueLength: 0 });
    expect(r.kind).toBe("apply-tag");
  });
  it("tag returned from the queue → re-park, do not apply", () => {
    const r = decideEnterAction({ hasActiveTag: true, activeTagFromQueue: true, activeText: "переписанный текст", queueLength: 1 });
    expect(r.kind).toBe("park-tag");
  });
  it("apply-all command text + non-empty queue → flush whole queue", () => {
    const r = decideEnterAction({ hasActiveTag: false, activeTagFromQueue: false, activeText: APPLY_ALL_COMMAND, queueLength: 3 });
    expect(r.kind).toBe("apply-all");
  });
  it("apply-all command but empty queue → falls through to free-text", () => {
    const r = decideEnterAction({ hasActiveTag: false, activeTagFromQueue: false, activeText: APPLY_ALL_COMMAND, queueLength: 0 });
    expect(r.kind).toBe("free-text");
  });
  it("tag present but no text typed → noop (nothing to apply or park)", () => {
    const r = decideEnterAction({ hasActiveTag: true, activeTagFromQueue: false, activeText: "   ", queueLength: 0 });
    expect(r.kind).toBe("noop");
  });
  it("no tag, free text → free-text branch", () => {
    const r = decideEnterAction({ hasActiveTag: false, activeTagFromQueue: false, activeText: "лёгкий запрос", queueLength: 0 });
    expect(r.kind).toBe("free-text");
  });
  it("apply-all command is matched case-insensitively and trimmed", () => {
    const r = decideEnterAction({ hasActiveTag: false, activeTagFromQueue: false, activeText: "  Применить Все Изменения  ", queueLength: 2 });
    expect(r.kind).toBe("apply-all");
  });
});
