import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { fetchAssistMulti, readLastAssistMeta } from "./assist-client";
import type { AssistRequest } from "./assist-contract";

const MINIMAL_REQUEST: AssistRequest = {
  text: "тестовый запрос",
  history: [],
  context: {
    screen: "test",
    dataSummary: "test summary",
  },
};

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })
  );
}

function mockFetchReject(name: string) {
  const err = new Error(name);
  err.name = name;
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAssistMulti — возвращаемое значение", () => {
  it("возвращает results при успешном ответе", async () => {
    mockFetch({ results: [{ kind: "answer", text: "привет" }] });
    const result = await fetchAssistMulti(MINIMAL_REQUEST);
    expect(result).toHaveLength(1);
    expect(result![0].kind).toBe("answer");
  });

  it("возвращает null при невалидной схеме", async () => {
    mockFetch({ unexpected: "format" });
    expect(await fetchAssistMulti(MINIMAL_REQUEST)).toBeNull();
  });

  it("возвращает null при сетевой ошибке", async () => {
    mockFetchReject("TypeError");
    expect(await fetchAssistMulti(MINIMAL_REQUEST)).toBeNull();
  });
});

describe("readLastAssistMeta — причина сбоя и latency", () => {
  it("успех → errorReason null, latency >= 0", async () => {
    mockFetch({ results: [{ kind: "answer", text: "ok" }] });
    await fetchAssistMulti(MINIMAL_REQUEST);
    expect(readLastAssistMeta().errorReason).toBeNull();
    expect(readLastAssistMeta().latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("503 → no-key", async () => {
    mockFetch({ error: "no-key" }, 503);
    await fetchAssistMulti(MINIMAL_REQUEST);
    expect(readLastAssistMeta().errorReason).toBe("no-key");
  });

  it("502 с error=rate-limited → rate-limited", async () => {
    mockFetch({ error: "rate-limited" }, 502);
    await fetchAssistMulti(MINIMAL_REQUEST);
    expect(readLastAssistMeta().errorReason).toBe("rate-limited");
  });

  it("502 прочее → ai-failed", async () => {
    mockFetch({ error: "ai-failed" }, 502);
    await fetchAssistMulti(MINIMAL_REQUEST);
    expect(readLastAssistMeta().errorReason).toBe("ai-failed");
  });

  it("TimeoutError → timeout", async () => {
    mockFetchReject("TimeoutError");
    await fetchAssistMulti(MINIMAL_REQUEST);
    expect(readLastAssistMeta().errorReason).toBe("timeout");
  });
});
