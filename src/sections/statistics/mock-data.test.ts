import { describe, expect, it } from "vitest";

import { sortRows, type GeneratedRow, type RowData } from "./mock-data";

function row(key: string, data: Partial<RowData>): GeneratedRow {
  const base: RowData = {
    expenses: "0,00 ₽",
    income: "0,00 ₽",
    sends: 0,
    actions: 0,
    holds: 0,
    approves: 0,
    ar: "0.00%",
    rejects: 0,
    rr: "0.00%",
    clicks: 0,
  };
  return { key, label: key, data: { ...base, ...data }, subRows: [] };
}

describe("sortRows", () => {
  const rows: GeneratedRow[] = [
    row("a", { clicks: 30 }),
    row("b", { clicks: 10 }),
    row("c", { clicks: 20 }),
  ];

  it("sort: null оставляет порядок как есть", () => {
    expect(sortRows(rows, null).map((r) => r.key)).toEqual(["a", "b", "c"]);
  });

  it("сортирует по числовой колонке по возрастанию", () => {
    const out = sortRows(rows, { column: "clicks", direction: "asc" });
    expect(out.map((r) => r.key)).toEqual(["b", "c", "a"]);
  });

  it("сортирует по числовой колонке по убыванию", () => {
    const out = sortRows(rows, { column: "clicks", direction: "desc" });
    expect(out.map((r) => r.key)).toEqual(["a", "c", "b"]);
  });

  it("сортирует по денежной строковой колонке по числовому значению", () => {
    const money: GeneratedRow[] = [
      row("x", { income: "1 200,50 ₽" }),
      row("y", { income: "980,00 ₽" }),
      row("z", { income: "12 000,00 ₽" }),
    ];
    const out = sortRows(money, { column: "income", direction: "desc" });
    expect(out.map((r) => r.key)).toEqual(["z", "x", "y"]);
  });

  it("сортирует по процентной колонке по числовому значению", () => {
    const pct: GeneratedRow[] = [
      row("p", { ar: "3.50%" }),
      row("q", { ar: "12.00%" }),
      row("r", { ar: "0.20%" }),
    ];
    const out = sortRows(pct, { column: "ar", direction: "asc" });
    expect(out.map((r) => r.key)).toEqual(["r", "p", "q"]);
  });

  it("сортирует по имени строки (label) по алфавиту", () => {
    const named: GeneratedRow[] = [
      { ...row("1", {}), label: "Берёза" },
      { ...row("2", {}), label: "Авто" },
      { ...row("3", {}), label: "Яблоко" },
    ];
    expect(
      sortRows(named, { column: "label", direction: "asc" }).map((r) => r.key),
    ).toEqual(["2", "1", "3"]);
    expect(
      sortRows(named, { column: "label", direction: "desc" }).map((r) => r.key),
    ).toEqual(["3", "1", "2"]);
  });

  it("не мутирует входной массив", () => {
    const input = [...rows];
    sortRows(input, { column: "clicks", direction: "asc" });
    expect(input.map((r) => r.key)).toEqual(["a", "b", "c"]);
  });
});
