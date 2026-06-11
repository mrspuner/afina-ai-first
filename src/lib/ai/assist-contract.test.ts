import { describe, expect, it } from "vitest";
import { assistRequestSchema, assistResultSchema, assistContextSchema } from "./assist-contract";

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

  // ── план 005: новые варианты результата ──────────────────────────────────────

  it("workflow-ops с валидной операцией проходит", () => {
    const r = assistResultSchema.safeParse({
      kind: "workflow-ops",
      ops: [{ kind: "add", nodeType: "push", placement: { mode: "auto" } }],
    });
    expect(r.success).toBe(true);
  });

  it("node-params без nodeId отклоняется", () => {
    const r = assistResultSchema.safeParse({
      kind: "node-params",
      patch: { title: "Новый заголовок" },
      confirmation: "Заголовок изменён",
    });
    expect(r.success).toBe(false);
  });

  it("node-params с nodeId проходит", () => {
    const r = assistResultSchema.safeParse({
      kind: "node-params",
      nodeId: "push-1",
      patch: { title: "Новый заголовок" },
      confirmation: "Заголовок изменён",
    });
    expect(r.success).toBe(true);
  });

  it("undo проходит", () => {
    const r = assistResultSchema.safeParse({ kind: "undo" });
    expect(r.success).toBe(true);
  });

  // ── план 005: граф в контексте ───────────────────────────────────────────────

  it("контекст с graph и selectedNode проходит", () => {
    const r = assistContextSchema.safeParse({
      screen: "workflow",
      dataSummary: "",
      graph: {
        nodes: [{ id: "signal", label: "Сигнал", nodeType: "signal", sublabel: "Тест" }],
        edges: [{ from: "signal", to: "push-1" }],
      },
      selectedNode: { id: "push-1", label: "Push", nodeType: "push" },
      undoAvailable: true,
    });
    expect(r.success).toBe(true);
  });

  it("контекст без graph по-прежнему валиден (обратная совместимость)", () => {
    const r = assistContextSchema.safeParse({
      screen: "section:Статистика",
      dataSummary: "кампаний: 3",
    });
    expect(r.success).toBe(true);
  });
});
