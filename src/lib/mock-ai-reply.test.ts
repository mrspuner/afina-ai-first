import { describe, it, expect } from "vitest";
import { mockReplyFor, mockReplyForFreeText } from "./mock-ai-reply";
import type { ParsedTriggerCommand } from "./trigger-edit-parser";

function edit(add: string[], exclude: string[]): ParsedTriggerCommand {
  return { kind: "edit", add, exclude };
}

describe("mockReplyFor", () => {
  it("add only", () => {
    expect(mockReplyFor(edit(["a.ru"], []))).toBe("Добавил 1 домен в триггер.");
    expect(mockReplyFor(edit(["a.ru", "b.ru"], []))).toBe("Добавил 2 домена в триггер.");
    expect(mockReplyFor(edit(["a.ru", "b.ru", "c.ru", "d.ru", "e.ru"], []))).toBe(
      "Добавил 5 доменов в триггер."
    );
  });

  it("exclude only", () => {
    expect(mockReplyFor(edit([], ["x.ru"]))).toBe("Исключил 1 домен.");
    expect(mockReplyFor(edit([], ["x.ru", "y.ru"]))).toBe("Исключил 2 домена.");
  });

  it("add + exclude", () => {
    expect(mockReplyFor(edit(["a.ru"], ["x.ru", "y.ru"]))).toBe(
      "Готово, добавил 1 домен и исключил 2 домена."
    );
  });

  it("clear-added", () => {
    expect(mockReplyFor({ kind: "clear-added" })).toBe(
      "Очистил список добавленных доменов."
    );
  });

  it("clear-excluded", () => {
    expect(mockReplyFor({ kind: "clear-excluded" })).toBe(
      "Очистил список исключённых."
    );
  });
});

describe("mockReplyForFreeText", () => {
  it("returns the prototype placeholder", () => {
    expect(mockReplyForFreeText()).toBe(
      "Принял, посмотрю и сообщу. (Это прототип — реального ответа не будет.)"
    );
  });
});
