import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isAiLogEnabled,
  setAiLogEnabled,
  appendAiLogEntry,
  readAiLogEntries,
  clearAiLog,
  AI_LOG_EVENT,
  type AiLogEntry,
} from "./dev-config";

const AI_LOG_KEY = "afina.dev.aiLog";
const AI_LOG_ENTRIES_KEY = "afina.dev.aiLog.entries";

function makeEntry(overrides: Partial<AiLogEntry> = {}): AiLogEntry {
  return {
    at: "2026-06-11T10:00:00.000Z",
    text: "тестовый запрос",
    resultKinds: ["answer"],
    outcome: "answer",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("isAiLogEnabled / setAiLogEnabled", () => {
  it("is off by default (key not set)", () => {
    expect(isAiLogEnabled()).toBe(false);
  });

  it("returns true after setAiLogEnabled(true)", () => {
    setAiLogEnabled(true);
    expect(isAiLogEnabled()).toBe(true);
  });

  it("returns false after setAiLogEnabled(false)", () => {
    setAiLogEnabled(true);
    setAiLogEnabled(false);
    expect(isAiLogEnabled()).toBe(false);
  });
});

describe("appendAiLogEntry", () => {
  it("no-op when flag is off", () => {
    appendAiLogEntry(makeEntry());
    expect(readAiLogEntries()).toEqual([]);
  });

  it("writes entry when flag is on", () => {
    setAiLogEnabled(true);
    const entry = makeEntry({ text: "привет" });
    appendAiLogEntry(entry);
    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("привет");
    expect(entries[0].outcome).toBe("answer");
  });

  it("appends multiple entries preserving order", () => {
    setAiLogEnabled(true);
    appendAiLogEntry(makeEntry({ text: "один" }));
    appendAiLogEntry(makeEntry({ text: "два" }));
    appendAiLogEntry(makeEntry({ text: "три" }));
    const entries = readAiLogEntries();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.text)).toEqual(["один", "два", "три"]);
  });

  it("enforces cap of 200: inserting 201 keeps last 200", () => {
    setAiLogEnabled(true);
    for (let i = 0; i < 201; i++) {
      appendAiLogEntry(makeEntry({ text: `entry-${i}` }));
    }
    const entries = readAiLogEntries();
    expect(entries).toHaveLength(200);
    // The last entry (index 200) must be present; the first (index 0) must be gone
    expect(entries[entries.length - 1].text).toBe("entry-200");
    expect(entries[0].text).toBe("entry-1");
  });
});

describe("extended AiLogEntry fields", () => {
  it("persists route/errorReason/latencyMs/screen", () => {
    setAiLogEnabled(true);
    appendAiLogEntry(
      makeEntry({ screen: "workflow", route: "ai", errorReason: null, latencyMs: 1234 })
    );
    const e = readAiLogEntries().at(-1)!;
    expect(e.route).toBe("ai");
    expect(e.errorReason).toBeNull();
    expect(e.latencyMs).toBe(1234);
    expect(e.screen).toBe("workflow");
  });

  it("dispatches AI_LOG_EVENT on append (when enabled)", () => {
    setAiLogEnabled(true);
    const spy = vi.fn();
    window.addEventListener(AI_LOG_EVENT, spy);
    appendAiLogEntry(makeEntry());
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(AI_LOG_EVENT, spy);
  });
});

describe("readAiLogEntries", () => {
  it("returns empty array when nothing is stored", () => {
    expect(readAiLogEntries()).toEqual([]);
  });

  it("returns empty array on broken JSON", () => {
    localStorage.setItem(AI_LOG_ENTRIES_KEY, "{not valid json");
    expect(readAiLogEntries()).toEqual([]);
  });
});

describe("clearAiLog", () => {
  it("removes all stored entries", () => {
    setAiLogEnabled(true);
    appendAiLogEntry(makeEntry());
    expect(readAiLogEntries()).toHaveLength(1);
    clearAiLog();
    expect(readAiLogEntries()).toEqual([]);
  });

  it("does not remove the enabled flag", () => {
    setAiLogEnabled(true);
    clearAiLog();
    expect(localStorage.getItem(AI_LOG_KEY)).toBe("on");
  });
});
