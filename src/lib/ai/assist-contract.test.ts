import { describe, expect, it } from "vitest";
import { assistRequestSchema, assistResultSchema } from "./assist-contract";

describe("assist-contract", () => {
  it("валидный запрос проходит", () => {
    const r = assistRequestSchema.safeParse({
      text: "какая кампания лучшая?",
      history: [{ role: "user", text: "привет" }],
      context: { screen: "section:Статистика", dataSummary: "кампаний: 3" },
    });
    expect(r.success).toBe(true);
  });
  it("история длиннее 8 отклоняется", () => {
    const history = Array.from({ length: 9 }, () => ({ role: "user" as const, text: "x" }));
    expect(assistRequestSchema.safeParse({
      text: "y", history, context: { screen: "s", dataSummary: "" },
    }).success).toBe(false);
  });
  it("clarify с 3 вопросами отклоняется", () => {
    expect(assistResultSchema.safeParse({
      kind: "clarify", questions: ["a", "b", "c"],
    }).success).toBe(false);
  });
  it("неизвестный kind отклоняется", () => {
    expect(assistResultSchema.safeParse({ kind: "magic" }).success).toBe(false);
  });
});
