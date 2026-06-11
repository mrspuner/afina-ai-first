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
