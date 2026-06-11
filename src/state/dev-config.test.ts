import { describe, it, expect, beforeEach } from "vitest";
import {
  isAiLogEnabled,
  setAiLogEnabled,
  appendAiLogEntry,
  readAiLogEntries,
  clearAiLog,
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
