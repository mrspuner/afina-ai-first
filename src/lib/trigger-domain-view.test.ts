// src/lib/trigger-domain-view.test.ts
import { describe, it, expect } from "vitest";
import {
  PREVIEW_VISIBLE_COUNT,
  splitSystemDomains,
  previewDomains,
} from "./trigger-domain-view";
import { EMPTY_DELTA, type TriggerDelta } from "./trigger-edit-parser";

const SYS = ["vtb.ru", "alfabank.ru", "gazprombank.ru", "sberbank.ru"];

describe("splitSystemDomains", () => {
  it("без правок все системные домены активны, исключённых нет", () => {
    const r = splitSystemDomains(SYS, EMPTY_DELTA);
    expect(r.active).toEqual(SYS);
    expect(r.excluded).toEqual([]);
  });

  it("домен из delta.excluded уходит из active в excluded", () => {
    const delta: TriggerDelta = { added: [], excluded: ["sberbank.ru"] };
    const r = splitSystemDomains(SYS, delta);
    expect(r.active).toEqual(["vtb.ru", "alfabank.ru", "gazprombank.ru"]);
    expect(r.excluded).toEqual(["sberbank.ru"]);
  });

  it("сравнение исключений регистронезависимо", () => {
    const delta: TriggerDelta = { added: [], excluded: ["SberBank.RU"] };
    const r = splitSystemDomains(SYS, delta);
    expect(r.active).not.toContain("sberbank.ru");
    expect(r.excluded).toEqual(["sberbank.ru"]);
  });

  it("исключённый домен, которого нет в системном списке, игнорируется", () => {
    const delta: TriggerDelta = { added: [], excluded: ["nonsystem.ru"] };
    const r = splitSystemDomains(SYS, delta);
    expect(r.active).toEqual(SYS);
    expect(r.excluded).toEqual([]);
  });

  it("порядок системных доменов сохраняется", () => {
    const delta: TriggerDelta = { added: [], excluded: ["alfabank.ru"] };
    const r = splitSystemDomains(SYS, delta);
    expect(r.active).toEqual(["vtb.ru", "gazprombank.ru", "sberbank.ru"]);
  });
});

describe("previewDomains", () => {
  it("PREVIEW_VISIBLE_COUNT равен 3", () => {
    expect(PREVIEW_VISIBLE_COUNT).toBe(3);
  });

  it("список короче лимита — показывает всё, overflow 0", () => {
    const r = previewDomains(["a.ru", "b.ru"], 3);
    expect(r.visible).toEqual(["a.ru", "b.ru"]);
    expect(r.overflowCount).toBe(0);
  });

  it("список ровно по лимиту — overflow 0", () => {
    const r = previewDomains(["a.ru", "b.ru", "c.ru"], 3);
    expect(r.visible).toEqual(["a.ru", "b.ru", "c.ru"]);
    expect(r.overflowCount).toBe(0);
  });

  it("список длиннее лимита — режет и считает остаток", () => {
    const r = previewDomains(["a.ru", "b.ru", "c.ru", "d.ru", "e.ru"], 3);
    expect(r.visible).toEqual(["a.ru", "b.ru", "c.ru"]);
    expect(r.overflowCount).toBe(2);
  });

  it("пустой список — пустое превью, overflow 0", () => {
    const r = previewDomains([], 3);
    expect(r.visible).toEqual([]);
    expect(r.overflowCount).toBe(0);
  });
});
