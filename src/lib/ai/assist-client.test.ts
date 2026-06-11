import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setAiLogEnabled, readAiLogEntries } from "@/state/dev-config";
import { fetchAssistMulti } from "./assist-client";
import type { AssistRequest } from "./assist-contract";

const MINIMAL_REQUEST: AssistRequest = {
  text: "тестовый запрос",
  history: [],
  context: {
    screen: "test",
    dataSummary: "test summary",
  },
};

function mockFetchSuccess(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })
  );
}

function mockFetchNetworkError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAssistMulti — журнал при включённом флаге", () => {
  it("записывает outcome=answer для ответа {results:[{kind:answer}]}", async () => {
    setAiLogEnabled(true);
    mockFetchSuccess({ results: [{ kind: "answer", text: "ответ" }] });

    await fetchAssistMulti(MINIMAL_REQUEST);

    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("тестовый запрос");
    expect(entries[0].resultKinds).toEqual(["answer"]);
    expect(entries[0].outcome).toBe("answer");
  });

  it("записывает outcome=applied для ответа с kind=workflow-ops", async () => {
    setAiLogEnabled(true);
    mockFetchSuccess({
      results: [
        {
          kind: "workflow-ops",
          ops: [],
        },
      ],
    });

    await fetchAssistMulti(MINIMAL_REQUEST);

    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("applied");
  });

  it("записывает outcome=clarify для ответа с kind=clarify", async () => {
    setAiLogEnabled(true);
    mockFetchSuccess({ results: [{ kind: "clarify", questions: ["уточните?"] }] });

    await fetchAssistMulti(MINIMAL_REQUEST);

    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("clarify");
  });

  it("записывает outcome=fallback при сетевой ошибке", async () => {
    setAiLogEnabled(true);
    mockFetchNetworkError();

    await fetchAssistMulti(MINIMAL_REQUEST);

    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("fallback");
    expect(entries[0].resultKinds).toEqual([]);
  });

  it("записывает outcome=fallback при не-2xx ответе сервера", async () => {
    setAiLogEnabled(true);
    mockFetchSuccess({}, 500);

    await fetchAssistMulti(MINIMAL_REQUEST);

    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("fallback");
  });

  it("записывает outcome=fallback при невалидной схеме ответа", async () => {
    setAiLogEnabled(true);
    mockFetchSuccess({ unexpected: "format" });

    await fetchAssistMulti(MINIMAL_REQUEST);

    const entries = readAiLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("fallback");
  });
});

describe("fetchAssistMulti — нет записей при выключённом флаге", () => {
  it("не пишет в журнал при флаге off (успешный ответ)", async () => {
    setAiLogEnabled(false);
    mockFetchSuccess({ results: [{ kind: "answer", text: "ответ" }] });

    await fetchAssistMulti(MINIMAL_REQUEST);

    expect(readAiLogEntries()).toEqual([]);
  });

  it("не пишет в журнал при флаге off (сетевая ошибка)", async () => {
    setAiLogEnabled(false);
    mockFetchNetworkError();

    await fetchAssistMulti(MINIMAL_REQUEST);

    expect(readAiLogEntries()).toEqual([]);
  });
});

describe("fetchAssistMulti — возвращаемое значение не изменилось", () => {
  it("возвращает results при успешном ответе", async () => {
    setAiLogEnabled(true);
    mockFetchSuccess({ results: [{ kind: "answer", text: "привет" }] });

    const result = await fetchAssistMulti(MINIMAL_REQUEST);
    expect(result).toHaveLength(1);
    expect(result![0].kind).toBe("answer");
  });

  it("возвращает null при сетевой ошибке", async () => {
    setAiLogEnabled(true);
    mockFetchNetworkError();

    const result = await fetchAssistMulti(MINIMAL_REQUEST);
    expect(result).toBeNull();
  });
});
