import { describe, it, expect } from "vitest";
import { unstringifyJsonArgs } from "./repair-tool-call";

describe("unstringifyJsonArgs", () => {
  it("распарсивает застрингифиченный вложенный объект (navigate.target)", () => {
    const input = JSON.stringify({
      target: '{"kind": "section", "section": "Статистика"}',
      confirmation: "Открыл статистику",
    });
    const out = unstringifyJsonArgs(input);
    expect(out).not.toBeNull();
    const parsed = JSON.parse(out!);
    expect(parsed.target).toEqual({ kind: "section", section: "Статистика" });
    expect(parsed.confirmation).toBe("Открыл статистику");
  });

  it("распарсивает застрингифиченный массив", () => {
    const input = JSON.stringify({ ops: '[{"kind":"remove","ref":"СМС"}]' });
    const parsed = JSON.parse(unstringifyJsonArgs(input)!);
    expect(parsed.ops).toEqual([{ kind: "remove", ref: "СМС" }]);
  });

  it("null, если чинить нечего (вложенные уже объекты)", () => {
    const input = JSON.stringify({ target: { kind: "section", section: "Сигналы" }, confirmation: "ok" });
    expect(unstringifyJsonArgs(input)).toBeNull();
  });

  it("обычные строковые поля не трогает", () => {
    const input = JSON.stringify({ text: "привет, как дела?" });
    expect(unstringifyJsonArgs(input)).toBeNull();
  });

  it("невалидный JSON → null", () => {
    expect(unstringifyJsonArgs("{не json")).toBeNull();
  });
});
