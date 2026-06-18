import { describe, it, expect, afterEach } from "vitest";
import { activeProviderId, providerKeyPresent, defaultModelId } from "./provider";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("activeProviderId", () => {
  it("по умолчанию deepseek", () => {
    delete process.env.AFINA_AI_PROVIDER;
    expect(activeProviderId()).toBe("deepseek");
  });

  it("google только при явном флаге", () => {
    process.env.AFINA_AI_PROVIDER = "google";
    expect(activeProviderId()).toBe("google");
  });

  it("неизвестное значение → deepseek", () => {
    process.env.AFINA_AI_PROVIDER = "openai";
    expect(activeProviderId()).toBe("deepseek");
  });
});

describe("providerKeyPresent", () => {
  it("читает ключ нужного провайдера", () => {
    process.env.DEEPSEEK_API_KEY = "x";
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    expect(providerKeyPresent("deepseek")).toBe(true);
    expect(providerKeyPresent("google")).toBe(false);
  });

  it("без ключа → false", () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(providerKeyPresent("deepseek")).toBe(false);
  });
});

describe("defaultModelId", () => {
  it("дефолт по провайдеру", () => {
    delete process.env.AFINA_AI_MODEL;
    expect(defaultModelId("deepseek")).toBe("deepseek-chat");
    expect(defaultModelId("google")).toBe("gemini-2.5-flash");
  });

  it("AFINA_AI_MODEL переопределяет", () => {
    process.env.AFINA_AI_MODEL = "deepseek-reasoner";
    expect(defaultModelId("deepseek")).toBe("deepseek-reasoner");
    expect(defaultModelId("google")).toBe("deepseek-reasoner");
  });
});
