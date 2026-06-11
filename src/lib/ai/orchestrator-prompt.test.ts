import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildMessages } from "./orchestrator-prompt";

describe("buildSystemPrompt", () => {
  it("содержит все четыре слоя в порядке: роль → знания → контекст", () => {
    const p = buildSystemPrompt({ screen: "workflow", dataSummary: "Кампаний: 2" });
    const roleIdx = p.indexOf("Ты — Афина");
    const knowledgeIdx = p.indexOf("# База знаний");
    const contextIdx = p.indexOf("# Контекст момента");
    expect(roleIdx).toBeGreaterThanOrEqual(0);
    expect(knowledgeIdx).toBeGreaterThan(roleIdx);
    expect(contextIdx).toBeGreaterThan(knowledgeIdx);
    expect(p).toContain("Кампаний: 2");
    expect(p).toContain("workflow");
  });

  it("с graph включает label ноды и рёбра", () => {
    const p = buildSystemPrompt({
      screen: "workflow",
      dataSummary: "",
      graph: {
        nodes: [
          { id: "signal", label: "Сигнал", nodeType: "signal" },
          { id: "n1", label: "СМС", nodeType: "sms" },
        ],
        edges: [{ from: "signal", to: "n1" }],
      },
    });
    expect(p).toContain("СМС");
    expect(p).toContain("signal → n1");
  });

  it("с selectedNode включает строку 'Выбрана нода'", () => {
    const p = buildSystemPrompt({
      screen: "workflow",
      dataSummary: "",
      graph: {
        nodes: [{ id: "n1", label: "СМС", nodeType: "sms" }],
        edges: [],
      },
      selectedNode: { id: "n1", label: "СМС", nodeType: "sms" },
    });
    expect(p).toContain("Выбрана нода");
  });

  it("без graph не содержит 'Текущий граф'", () => {
    const p = buildSystemPrompt({ screen: "workflow", dataSummary: "" });
    expect(p).not.toContain("Текущий граф");
  });
});

describe("buildMessages", () => {
  it("история идёт перед текущим вопросом", () => {
    const m = buildMessages(
      [{ role: "user", text: "сколько потратили в июне?" },
       { role: "assistant", text: "В июне — $1200." }],
      "а в мае?"
    );
    expect(m).toHaveLength(3);
    expect(m[2]).toEqual({ role: "user", content: "а в мае?" });
  });
});
