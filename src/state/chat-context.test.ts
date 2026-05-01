// src/state/chat-context.test.ts
import { describe, it, expect } from "vitest";
import { chatReducer, type ChatState, type ChatMessage } from "./chat-context";

const empty: ChatState = {
  messages: [],
  mode: "collapsed",
  previousBarMode: "collapsed",
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
    s = { ...s, mode: "expanded" };
    s = chatReducer(s, { type: "clear" });
    expect(s.messages).toEqual([]);
    expect(s.mode).toBe("expanded");
  });

  it("set_mode toggles between collapsed and expanded", () => {
    let s = chatReducer(empty, { type: "set_mode", mode: "expanded" });
    expect(s.mode).toBe("expanded");
    s = chatReducer(s, { type: "set_mode", mode: "collapsed" });
    expect(s.mode).toBe("collapsed");
  });

  it("open_sidebar remembers the bar mode and switches to sidebar", () => {
    let s: ChatState = { ...empty, mode: "expanded", previousBarMode: "collapsed" };
    s = chatReducer(s, { type: "open_sidebar" });
    expect(s.mode).toBe("sidebar");
    expect(s.previousBarMode).toBe("expanded");
  });

  it("close_sidebar restores the remembered bar mode", () => {
    let s: ChatState = {
      ...empty,
      mode: "sidebar",
      previousBarMode: "expanded",
    };
    s = chatReducer(s, { type: "close_sidebar" });
    expect(s.mode).toBe("expanded");
  });

  it("open_sidebar from sidebar is a no-op (does not overwrite previousBarMode)", () => {
    let s: ChatState = {
      ...empty,
      mode: "sidebar",
      previousBarMode: "expanded",
    };
    s = chatReducer(s, { type: "open_sidebar" });
    expect(s.mode).toBe("sidebar");
    expect(s.previousBarMode).toBe("expanded");
  });
});
