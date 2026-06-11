import { describe, expect, it } from "vitest";
import { AFINA_KNOWLEDGE } from "./afina-knowledge";

describe("AFINA_KNOWLEDGE", () => {
  it("содержит все 7 разделов", () => {
    for (const h of [
      "## Что такое Афина",
      "## Сущности и связи",
      "## Карта интерфейса",
      "## Границы",
      "## Правила ответов",
      "## Словарь пользователя",
      "## Уточняющие вопросы",
    ]) {
      expect(AFINA_KNOWLEDGE).toContain(h);
    }
  });
  it("укладывается в токен-бюджет (≈4K токенов ≤ 16000 символов)", () => {
    expect(AFINA_KNOWLEDGE.length).toBeGreaterThan(2000);
    expect(AFINA_KNOWLEDGE.length).toBeLessThan(16000);
  });
  it("не содержит плейсхолдеров", () => {
    expect(AFINA_KNOWLEDGE).not.toMatch(/<\.\.\.|TBD|TODO/);
  });
});
