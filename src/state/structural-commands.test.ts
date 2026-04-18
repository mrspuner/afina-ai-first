import { describe, it, expect } from "vitest";
import { parseStructuralCommands } from "./structural-commands";

describe("parseStructuralCommands", () => {
  it("parses simple add after", () => {
    const r = parseStructuralCommands("добавь Email после СМС");
    expect(r.ops).toEqual([
      {
        kind: "add",
        nodeType: "email",
        placement: { mode: "after", ref: "СМС" },
        inlineParams: undefined,
      },
    ]);
  });

  it("parses add before", () => {
    const r = parseStructuralCommands("вставь Push перед Успех");
    expect(r.ops[0]).toMatchObject({
      kind: "add",
      nodeType: "push",
      placement: { mode: "before", ref: "Успех" },
    });
  });

  it("parses add between", () => {
    const r = parseStructuralCommands("добавь Задержка между СМС и Email");
    expect(r.ops[0]).toMatchObject({
      kind: "add",
      nodeType: "wait",
      placement: { mode: "between", refA: "СМС", refB: "Email" },
    });
  });

  it("parses add with auto placement", () => {
    const r = parseStructuralCommands("добавь Email");
    expect(r.ops[0]).toMatchObject({
      kind: "add",
      nodeType: "email",
      placement: { mode: "auto" },
    });
  });

  it("captures inline params in add", () => {
    const r = parseStructuralCommands("добавь задержка 2 часа после СМС");
    expect(r.ops[0]).toMatchObject({
      kind: "add",
      nodeType: "wait",
      placement: { mode: "after", ref: "СМС" },
      inlineParams: "2 часа",
    });
  });

  it("parses remove", () => {
    const r = parseStructuralCommands("убери Push");
    expect(r.ops[0]).toEqual({ kind: "remove", ref: "Push" });
  });

  it("parses remove with multi-word ref", () => {
    const r = parseStructuralCommands("удали Задержка 3");
    expect(r.ops[0]).toEqual({ kind: "remove", ref: "Задержка 3" });
  });

  it("parses replace", () => {
    const r = parseStructuralCommands("замени Витрина на Лендинг");
    expect(r.ops[0]).toEqual({
      kind: "replace",
      ref: "Витрина",
      newType: "landing",
      inlineParams: undefined,
    });
  });

  it("parses replace with inline params", () => {
    const r = parseStructuralCommands("замени СМС на email тема: скидка");
    expect(r.ops[0]).toMatchObject({
      kind: "replace",
      ref: "СМС",
      newType: "email",
      inlineParams: "тема: скидка",
    });
  });

  it("splits multi-op by comma", () => {
    const r = parseStructuralCommands("добавь Email после СМС, убери Push");
    expect(r.ops).toHaveLength(2);
  });

  it("splits multi-op by 'и'", () => {
    const r = parseStructuralCommands("убери Push и убери Email");
    expect(r.ops).toHaveLength(2);
  });

  it("ignores @-segments", () => {
    const r = parseStructuralCommands("@СМС текст: новый, добавь Email после СМС");
    expect(r.ops).toHaveLength(1);
    expect(r.ops[0].kind).toBe("add");
  });

  it("treats verbs inside @-segment as content", () => {
    const r = parseStructuralCommands("@СМС добавь скидку 20%");
    expect(r.ops).toHaveLength(0);
  });

  it("returns unrecognized for non-structural non-tag", () => {
    const r = parseStructuralCommands("какая-то ерунда");
    expect(r.ops).toHaveLength(0);
    expect(r.unrecognized).toContain("какая-то ерунда");
  });

  it("rejects unknown type", () => {
    const r = parseStructuralCommands("добавь Виноват после СМС");
    expect(r.ops).toHaveLength(0);
    expect(r.unrecognized).toHaveLength(1);
  });

  it("case-insensitive verbs and types", () => {
    const r = parseStructuralCommands("ДОБАВЬ email ПОСЛЕ смс");
    expect(r.ops[0]).toMatchObject({ kind: "add", nodeType: "email" });
  });
});
