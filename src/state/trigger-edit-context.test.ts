import { describe, it, expect } from "vitest";
import { NOOP_TRIGGER_EDIT_API } from "./trigger-edit-context";

/**
 * @testing-library/react is not installed in this project; the test env is
 * "node" (no jsdom). We verify the fallback API object directly — it is the
 * same value that `useTriggerEdit()` returns when called outside a provider
 * (React's createContext default is NOOP_TRIGGER_EDIT_API).
 */
describe("useTriggerEdit", () => {
  it("без провайдера возвращает no-op fallback (вне step-2 шагов)", () => {
    const fallback = NOOP_TRIGGER_EDIT_API;

    expect(typeof fallback.applyToTrigger).toBe("function");
    expect(typeof fallback.highlightTrigger).toBe("function");
    expect(typeof fallback.randomRemix).toBe("function");
    expect(typeof fallback.resolveTriggerIdByLabel).toBe("function");

    // No-ops must not throw.
    expect(() =>
      fallback.applyToTrigger("any", { kind: "edit", add: [], exclude: [] })
    ).not.toThrow();

    expect(fallback.resolveTriggerIdByLabel("nope")).toBeNull();
  });
});
