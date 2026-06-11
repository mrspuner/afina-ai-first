import { describe, expect, it } from "vitest";
import { statsPatchSchema, toFiltersPatch } from "./stats-patch-schema";

describe("statsPatchSchema", () => {
  it("валидный патч: rows campaigns + sort income desc + period custom + rowCount 10", () => {
    const r = statsPatchSchema.safeParse({
      rows: "campaigns",
      sort: { column: "income", direction: "desc" },
      period: { preset: "custom", from: "2026-06-01", to: "2026-06-30" },
      rowCount: 10,
    });
    expect(r.success).toBe(true);
  });

  it("пустой объект валиден", () => {
    expect(statsPatchSchema.safeParse({}).success).toBe(true);
  });

  it("subRows 'none' валиден", () => {
    expect(statsPatchSchema.safeParse({ subRows: "none" }).success).toBe(true);
  });

  it("rows 'космос' отклоняется", () => {
    expect(statsPatchSchema.safeParse({ rows: "космос" }).success).toBe(false);
  });

  it("rowCount 0 отклоняется", () => {
    expect(statsPatchSchema.safeParse({ rowCount: 0 }).success).toBe(false);
  });

  it("rowCount 101 отклоняется (> max 100)", () => {
    expect(statsPatchSchema.safeParse({ rowCount: 101 }).success).toBe(false);
  });
});

describe("toFiltersPatch", () => {
  it("маппит валидный патч в те же поля", () => {
    const patch = toFiltersPatch({
      rows: "campaigns",
      sort: { column: "income", direction: "desc" },
      period: { preset: "custom", from: "2026-06-01", to: "2026-06-30" },
      rowCount: 10,
    });
    expect(patch.rows).toBe("campaigns");
    expect(patch.sort).toEqual({ column: "income", direction: "desc" });
    expect(patch.period).toEqual({ preset: "custom", from: "2026-06-01", to: "2026-06-30" });
    expect(patch.rowCount).toBe(10);
  });

  it("clearSort:true → sort:null", () => {
    const patch = toFiltersPatch({ clearSort: true });
    expect(patch.sort).toBeNull();
  });

  it("clearSort не устанавливает лишних полей при пустом патче", () => {
    const patch = toFiltersPatch({ clearSort: true });
    expect(Object.keys(patch)).toEqual(["sort"]);
  });

  it("пустой объект → пустой патч", () => {
    expect(toFiltersPatch({})).toEqual({});
  });
});
