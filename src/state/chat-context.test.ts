// src/state/chat-context.test.ts
import { describe, it, expect } from "vitest";
import { chatReducer, type ChatState, type ChatMessage } from "./chat-context";

const empty: ChatState = {
  messages: [],
  mode: "collapsed",
};

function msg(partial: Partial<ChatMessage> & Pick<ChatMessage, "role" | "text">): ChatMessage {
  return {
    id: partial.id ?? `msg_test_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: partial.createdAt ?? 1_700_000_000_000,
    ...partial,
  };
}

describe("chatReducer", () => {
  it("append stores the provided message verbatim", () => {
    const m = msg({ id: "msg_1", role: "user", text: "hi" });
    const next = chatReducer(empty, { type: "append", message: m });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]).toEqual(m);
  });

  it("append preserves triggerLabel and pending flag", () => {
    const a = msg({ id: "a", role: "user", text: "add a.ru", triggerLabel: "Сайты автодилеров" });
    const b = msg({ id: "b", role: "assistant", text: "", pending: true });
    const s1 = chatReducer(empty, { type: "append", message: a });
    expect(s1.messages[0].triggerLabel).toBe("Сайты автодилеров");
    const s2 = chatReducer(empty, { type: "append", message: b });
    expect(s2.messages[0].pending).toBe(true);
  });

  it("update_pending replaces text and clears pending flag for matching id", () => {
    let s: ChatState = chatReducer(empty, {
      type: "append",
      message: msg({ id: "ph", role: "assistant", text: "", pending: true }),
    });
    s = chatReducer(s, { type: "update_pending", id: "ph", text: "Готово." });
    expect(s.messages[0].text).toBe("Готово.");
    expect(s.messages[0].pending).toBeUndefined();
  });

  it("clear empties messages but preserves mode", () => {
    let s: ChatState = chatReducer(empty, {
      type: "append",
      message: msg({ role: "user", text: "x" }),
    });
    s = { ...s, mode: "sidebar" };
    s = chatReducer(s, { type: "clear" });
    expect(s.messages).toEqual([]);
    expect(s.mode).toBe("sidebar");
  });
});

describe("chatReducer mode transitions", () => {
  it("open_sidebar from collapsed → sidebar", () => {
    const s = chatReducer(empty, { type: "open_sidebar" });
    expect(s.mode).toBe("sidebar");
  });

  it("close_sidebar returns to collapsed", () => {
    const s1 = chatReducer(empty, { type: "open_sidebar" });
    const s2 = chatReducer(s1, { type: "close_sidebar" });
    expect(s2.mode).toBe("collapsed");
  });

  it("open_sidebar when already sidebar is a no-op (same reference)", () => {
    const s1 = chatReducer(empty, { type: "open_sidebar" });
    expect(chatReducer(s1, { type: "open_sidebar" })).toBe(s1);
  });

  it("close_sidebar when already collapsed is a no-op (same reference)", () => {
    expect(chatReducer(empty, { type: "close_sidebar" })).toBe(empty);
  });
});
